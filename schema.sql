CREATE TABLE IF NOT EXISTS internships (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  title          TEXT    NOT NULL,
  company        TEXT    NOT NULL,
  location       TEXT    NOT NULL,
  work_mode      TEXT    NOT NULL CHECK (work_mode IN ('remote', 'onsite', 'hybrid')),
  duration_weeks INTEGER NOT NULL CHECK (duration_weeks > 0),
  stipend        INTEGER NOT NULL DEFAULT 0 CHECK (stipend >= 0),
  status         TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  description    TEXT    NOT NULL DEFAULT '',
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  internship_id INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  full_name     TEXT    NOT NULL,
  email         TEXT    NOT NULL,
  phone         TEXT,
  cover_note    TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (internship_id, email)
);
