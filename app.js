const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const db = require("./db");
const { validateApplication } = require("./validate");

const STATUSES = ["open", "closed"];

const sendError = (res, status, code, message, details) =>
  res.status(status).json({ error: { code, message, ...(details && { details }) } });

function createApp({ apiLimit = 100, applyLimit = 5 } = {}) {
  const app = express();

  // Secure headers (CSP, nosniff, frameguard, hides X-Powered-By)
  app.use(helmet());

  // Rate limits: general API and a stricter one for the application form
  const limiter = (limit) =>
    rateLimit({
      windowMs: 60 * 1000,
      limit,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      handler: (req, res) =>
        sendError(res, 429, "RATE_LIMITED", "Too many requests. Please try again in a minute."),
    });
  app.use("/api", limiter(apiLimit));

  // Small body limit stops oversized payloads
  app.use(express.json({ limit: "10kb" }));
  app.use(express.static(path.join(__dirname, "..", "public")));

  // ---- Internships ----
  app.get("/api/internships", (req, res) => {
    const page = req.query.page === undefined ? 1 : Number(req.query.page);
    const limit = req.query.limit === undefined ? 4 : Number(req.query.limit);
    if (!Number.isInteger(page) || page < 1)
      return sendError(res, 400, "INVALID_QUERY", "page must be a positive integer");
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      return sendError(res, 400, "INVALID_QUERY", "limit must be an integer from 1 to 50");

    const where = [];
    const params = [];
    if (req.query.status !== undefined) {
      if (!STATUSES.includes(req.query.status))
        return sendError(res, 400, "INVALID_QUERY", "status must be open or closed");
      where.push("status = ?");
      params.push(req.query.status);
    }
    if (typeof req.query.q === "string" && req.query.q) {
      where.push("(title LIKE ? OR company LIKE ?)");
      params.push(`%${req.query.q}%`, `%${req.query.q}%`);
    }

    // Parameterized queries only: user input never goes into the SQL text
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const total = db.prepare(`SELECT COUNT(*) AS n FROM internships ${clause}`).get(...params).n;
    const rows = db
      .prepare(`SELECT * FROM internships ${clause} ORDER BY id LIMIT ? OFFSET ?`)
      .all(...params, limit, (page - 1) * limit);

    res.json({ data: rows, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } });
  });

  app.get("/api/internships/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1)
      return sendError(res, 400, "INVALID_ID", "id must be a positive integer");
    const row = db.prepare("SELECT * FROM internships WHERE id = ?").get(id);
    if (!row) return sendError(res, 404, "NOT_FOUND", `Internship ${id} not found`);
    res.json({ data: row });
  });

  // ---- Applications ----
  app.post("/api/applications", limiter(applyLimit), (req, res) => {
    const { errors, value } = validateApplication(req.body);
    if (errors.length) return sendError(res, 400, "VALIDATION_ERROR", "Invalid input", errors);

    const internship = db
      .prepare("SELECT id, status FROM internships WHERE id = ?")
      .get(value.internship_id);
    if (!internship) return sendError(res, 404, "NOT_FOUND", "Internship not found");
    if (internship.status !== "open")
      return sendError(res, 409, "INTERNSHIP_CLOSED", "This internship is closed for applications");

    try {
      const info = db
        .prepare(
          `INSERT INTO applications (internship_id, full_name, email, phone, cover_note)
           VALUES (@internship_id, @full_name, @email, @phone, @cover_note)`
        )
        .run(value);
      res.status(201).json({ data: { id: info.lastInsertRowid, internship_id: value.internship_id } });
    } catch (err) {
      if (String(err.code).startsWith("SQLITE_CONSTRAINT"))
        return sendError(res, 409, "DUPLICATE_APPLICATION", "You have already applied to this internship");
      throw err;
    }
  });

  // ---- Errors ----
  app.use("/api", (req, res) => sendError(res, 404, "NOT_FOUND", "Route not found"));
  app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed")
      return sendError(res, 400, "INVALID_JSON", "Request body is not valid JSON");
    if (err.type === "entity.too.large")
      return sendError(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large");
    console.error(err);
    sendError(res, 500, "SERVER_ERROR", "Something went wrong");
  });

  return app;
}

module.exports = { createApp };
