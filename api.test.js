process.env.DB_FILE = ":memory:";

const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const db = require("../src/db");
const { createApp } = require("../src/app");

const seed = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "seed.json"), "utf8"));
let server, base;

const validApplication = (over = {}) => ({
  internship_id: 1,
  full_name: "Asha Nair",
  email: "asha@example.com",
  phone: "+91 98765 43210",
  cover_note: "I enjoy building web apps and want to learn from a real team.",
  ...over,
});

const post = (url, body, raw) =>
  fetch(base + url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });

before(async () => {
  const insert = db.prepare(
    `INSERT INTO internships (title, company, location, work_mode, duration_weeks, stipend, status, description)
     VALUES (@title, @company, @location, @work_mode, @duration_weeks, @stipend, @status, @description)`
  );
  seed.forEach((r) => insert.run(r));
  server = createApp({ apiLimit: 1000, applyLimit: 1000 }).listen(0);
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

test("GET /api/internships returns paginated data with meta", async () => {
  const res = await fetch(`${base}/api/internships?page=2&limit=3`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.length, 3);
  assert.deepEqual(body.meta, { page: 2, limit: 3, total: 8, total_pages: 3 });
});

test("GET /api/internships filters by status and search", async () => {
  const open = await (await fetch(`${base}/api/internships?status=open&limit=50`)).json();
  assert.ok(open.data.every((i) => i.status === "open"));
  const found = await (await fetch(`${base}/api/internships?q=Lumen`)).json();
  assert.equal(found.data.length, 1);
});

test("GET /api/internships rejects a bad page with 400", async () => {
  const res = await fetch(`${base}/api/internships?page=0`);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, "INVALID_QUERY");
});

test("GET /api/internships/:id returns 200 and 404", async () => {
  assert.equal((await fetch(`${base}/api/internships/1`)).status, 200);
  assert.equal((await fetch(`${base}/api/internships/999`)).status, 404);
  assert.equal((await fetch(`${base}/api/internships/abc`)).status, 400);
});

test("POST /api/applications accepts a valid application (201)", async () => {
  const res = await post("/api/applications", validApplication());
  assert.equal(res.status, 201);
  assert.ok((await res.json()).data.id);
});

test("POST /api/applications rejects invalid input with field details (400)", async () => {
  const res = await post("/api/applications", validApplication({ full_name: "A", email: "nope", cover_note: "short" }));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.error.code, "VALIDATION_ERROR");
  const fields = body.error.details.map((d) => d.field).sort();
  assert.deepEqual(fields, ["cover_note", "email", "full_name"]);
});

test("POST /api/applications rejects a duplicate (409)", async () => {
  const res = await post("/api/applications", validApplication());
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, "DUPLICATE_APPLICATION");
});

test("POST /api/applications rejects a closed internship (409)", async () => {
  const res = await post("/api/applications", validApplication({ internship_id: 4, email: "b@example.com" }));
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error.code, "INTERNSHIP_CLOSED");
});

test("POST /api/applications returns 404 for an unknown internship", async () => {
  const res = await post("/api/applications", validApplication({ internship_id: 999, email: "c@example.com" }));
  assert.equal(res.status, 404);
});

test("POST /api/applications rejects malformed JSON (400)", async () => {
  const res = await post("/api/applications", null, "{bad json");
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error.code, "INVALID_JSON");
});

test("POST /api/applications rejects an oversized body (413)", async () => {
  const res = await post("/api/applications", validApplication({ cover_note: "x".repeat(20000) }));
  assert.equal(res.status, 413);
});

test("SQL injection text is treated as plain data", async () => {
  const q = encodeURIComponent("' OR 1=1 --");
  const res = await fetch(`${base}/api/internships?q=${q}`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).data.length, 0);

  const evil = validApplication({ email: "d@example.com", full_name: "Robert'); DROP TABLE internships;--" });
  assert.equal((await post("/api/applications", evil)).status, 201);
  const still = await (await fetch(`${base}/api/internships`)).json();
  assert.equal(still.meta.total, 8); // table still exists with all rows
});

test("Secure headers are set and X-Powered-By is hidden", async () => {
  const res = await fetch(`${base}/api/internships`);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.ok(res.headers.get("content-security-policy"));
  assert.ok(res.headers.get("strict-transport-security"));
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("Rate limit returns 429 after too many applications", async () => {
  const limited = createApp({ apiLimit: 1000, applyLimit: 2 }).listen(0);
  const url = `http://localhost:${limited.address().port}/api/applications`;
  const send = () =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  const statuses = [];
  for (let i = 0; i < 3; i++) statuses.push((await send()).status);
  limited.close();
  assert.deepEqual(statuses, [400, 400, 429]);
});

test("Frontend page is served", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Internship Board/);
});
