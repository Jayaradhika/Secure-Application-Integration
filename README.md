# Internship Board - Secure Application Integration

Express API plus a plain HTML/CSS/JS frontend. Users can browse internships and submit an application form with client and server validation.

## Setup
```bash
npm install
npm run seed    # creates data.db with 8 sample internships
npm start       # open http://localhost:3000
npm test        # runs the 15 tests
```
Requires Node.js 18 or newer.

## Features
- Internship list with search, status filter, pagination, loading state, error state and Retry
- Application form validated in the browser and again on the server
- Rate limiting, secure headers (helmet), parameterized queries, body size limit

## API
| Method | Path | Notes |
|---|---|---|
| GET | `/api/internships` | `page`, `limit`, `status`, `q` |
| GET | `/api/internships/:id` | 200 or 404 |
| POST | `/api/applications` | 201, 400, 404, 409, 429 |

Example:
```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"internship_id":1,"full_name":"Asha Nair","email":"asha@example.com","cover_note":"I enjoy building web apps and want to learn."}'
```

## Files
- `public/` - frontend (`index.html`, `style.css`, `app.js`)
- `src/` - `app.js` (routes, security), `validate.js`, `db.js`, `seed.js`, `server.js`
- `test/api.test.js` - tests
- `schema.sql`, `seed.json` - database
- `TEST_REPORT.md`, `SECURITY_CHECKLIST.md` - deliverables
