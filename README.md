# V-Spark: Prompt Engineering Competition

Public competition page + registration API + admin panel.
**Stack:** Node.js, Express, MySQL (Laragon), vanilla HTML/CSS/JS.

## Run locally (Laragon)

1. Start **MySQL** in Laragon.
2. Create the database and tables:
   `mysql -u root < schema.sql` (or paste `schema.sql` into HeidiSQL / phpMyAdmin).
3. `copy .env.example .env` (Windows) and fill in two secrets:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` (run twice: ACCESS_SECRET, REFRESH_SECRET).
   Laragon defaults (`root`, empty password) already match `.env.example`.
4. `npm install`
5. Create your admin: `npm run seed:admin -- you@example.com "YourStrongPassword" superadmin`
6. `npm start`, then open:
   - Public page: http://localhost:3000
   - Admin panel: http://localhost:3000/admin
7. Tests: `npm test`

## New in this version
- **/admin** tabs: Dashboard (stats, Drive link, links, recent participants with Remove), Participants (search + Remove), Payments (view receipt, Mark paid / Reject / Reset), Results (position, score, remark, Publish).
- **/portal**: participant signs in with email + reference number: sees payment status, Drive submission link, important links and result.
- **/results**: public podium (top 3) + full list, only after the admin presses Publish.
- Receipts are now stored inside MySQL (Railway's disk is wiped on every deploy). `npm start` first runs `scripts/init-db.js`, which creates missing tables/columns safely and, if `ADMIN_EMAIL` + `ADMIN_PASSWORD` are set, creates the superadmin.
- Remove / Drive link / links / results need the **superadmin** role. Reviewers can verify payments only.

## What still needs the organizers' official info
Search `index.html` for `TBA` and `[PLACEHOLDER]`: deadline, eligibility, dates, payment account details, marks weighting, contact/social links.

## How registration works
Form -> client validation -> `POST /api/registrations` (multipart) -> server validation -> real file-signature check -> receipt saved privately -> MySQL row (`pending`) -> reference `VS-PE-0001`. The success screen appears only when the server returns that reference. Admins verify payments in `/admin`; new registrations appear live (SSE).

## Security concepts used
| Concept | Where |
|---|---|
| Password hashing (bcrypt, cost 12, timing-equalised login) | `routes/admin.js` |
| JWT access (15 min) + rotating refresh token (7 days), httpOnly + SameSite=Strict cookies, reuse detection | `routes/admin.js` |
| RBAC (`superadmin`, `reviewer`) | `middleware/auth.js`, delete route |
| CSRF defence (SameSite + custom header) | `middleware/auth.js` |
| Helmet + strict CSP, CORS allow-list, no `x-powered-by` | `server.js` |
| Rate limiting (registration, login) | both route files |
| Parameterised SQL (no string-built queries) | all DB calls |
| Input validation/sanitising, HPP-safe | `validate.js` |
| Secure upload: size limit, magic-byte check, random name, private folder, admin-only access | `upload.js` |
| XSS-safe admin rendering (`textContent` only) | `public/js/admin.js` |
| REST API + Server-Sent Events | `routes/` |

## Deploying
Vercel serverless can't keep uploaded files or a long-lived SSE connection. Deploy this app on Render, Railway, or a VPS with a hosted MySQL and a persistent disk for `private_uploads/`, set the `.env` values there (`NODE_ENV=production`), and link the V-Spark "Prompt Engineering" card to that URL.
Not tested against a live MySQL server in this build: run the steps above and tell me about any error.

## Hero photo
The hero uses `public/img/campus.jpg` (falls back to a dark gradient if missing). Copy the campus photo from the main VSpark site into that path.
