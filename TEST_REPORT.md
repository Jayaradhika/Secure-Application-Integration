# Test Report

Run with `npm test` (Node.js built-in test runner, in-memory SQLite database).

**Result: 15 passed, 0 failed.**

| # | Test | Result |
|---|---|---|
| 1 | List returns paginated data with meta | Pass |
| 2 | List filters by status and search | Pass |
| 3 | Bad page number returns 400 | Pass |
| 4 | Detail returns 200, 404 and 400 | Pass |
| 5 | Valid application returns 201 | Pass |
| 6 | Invalid application returns 400 with field details | Pass |
| 7 | Duplicate application returns 409 | Pass |
| 8 | Closed internship returns 409 | Pass |
| 9 | Unknown internship returns 404 | Pass |
| 10 | Malformed JSON returns 400 | Pass |
| 11 | Oversized body returns 413 | Pass |
| 12 | SQL injection text is treated as plain data | Pass |
| 13 | Secure headers set, X-Powered-By hidden | Pass |
| 14 | Rate limit returns 429 after too many requests | Pass |
| 15 | Frontend page is served | Pass |

## Raw output
```
✔ GET /api/internships returns paginated data with meta
✔ GET /api/internships filters by status and search
✔ GET /api/internships rejects a bad page with 400
✔ GET /api/internships/:id returns 200 and 404
✔ POST /api/applications accepts a valid application (201)
✔ POST /api/applications rejects invalid input with field details (400)
✔ POST /api/applications rejects a duplicate (409)
✔ POST /api/applications rejects a closed internship (409)
✔ POST /api/applications returns 404 for an unknown internship
✔ POST /api/applications rejects malformed JSON (400)
✔ POST /api/applications rejects an oversized body (413)
✔ SQL injection text is treated as plain data
✔ Secure headers are set and X-Powered-By is hidden
✔ Rate limit returns 429 after too many applications
✔ Frontend page is served
ℹ tests 15
ℹ pass 15
ℹ fail 0
```

## Manual checks (frontend)
- Loading message shows while data loads.
- Stopping the server shows an error message with a Retry button.
- Empty or invalid form fields show messages next to each field.
- Server errors (duplicate, closed internship) show in the form message.
