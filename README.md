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
<img width="1354" height="673" alt="image" src="https://github.com/user-attachments/assets/693aca8b-938d-470c-a1ce-a80ab85a3869" />

<img width="1353" height="678" alt="image" src="https://github.com/user-attachments/assets/396d0600-2b0a-42e8-b116-117f0fd14c94" />
<img width="1245" height="693" alt="image" src="https://github.com/user-attachments/assets/81aa0772-d716-4598-8bde-b2cf85cec696" />
<img width="1320" height="677" alt="image" src="https://github.com/user-attachments/assets/40ce5207-11c3-4aee-b751-10c94b290d37" />
<img width="1363" height="674" alt="image" src="https://github.com/user-attachments/assets/b2392448-53e0-4ddc-9d93-a7462ccfdc81" />
<img width="1354" height="672" alt="image" src="https://github.com/user-attachments/assets/f69d33b3-3c82-44ec-bf93-84299603f730" />
<img width="1334" height="694" alt="image" src="https://github.com/user-attachments/assets/b5aead68-ada1-4a51-88db-05b065722d47" />
Participant portal 
<img width="1312" height="669" alt="image" src="https://github.com/user-attachments/assets/64e1f471-8d60-4c69-bdb2-4dd93b362e73" />

<img width="1348" height="680" alt="image" src="https://github.com/user-attachments/assets/fbbf5a98-8c72-4fae-8ad9-156d57e25d37" />
<img width="1342" height="671" alt="image" src="https://github.com/user-attachments/assets/002f87cd-ffc3-46dc-aaea-e7b13f781113" />
https://vspark-production-b2f96e3c.up.railway.app/
https://vspark-production-b2f96e3c.up.railway.app/portal
https://vspark-production-b2f96e3c.up.railway.app/results




