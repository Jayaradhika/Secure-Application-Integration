const fs = require("fs");
const path = require("path");
const db = require("./db");

const records = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "seed.json"), "utf8")
);

const insert = db.prepare(`
  INSERT INTO internships (title, company, location, work_mode, duration_weeks, stipend, status, description)
  VALUES (@title, @company, @location, @work_mode, @duration_weeks, @stipend, @status, @description)
`);

db.transaction(() => {
  db.exec("DELETE FROM applications");
  db.exec("DELETE FROM internships");
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('internships', 'applications')");
  records.forEach((r) => insert.run(r));
})();

console.log(`Seeded ${records.length} internships.`);
