const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const secrets = require('../secrets');
const { getSetting, setSetting } = require('../settings');
const events = require('../events');
const { requireAuth, requireRole, csrf } = require('../middleware/auth');
const { removeReceipt, DIR } = require('../upload');

const prod = process.env.NODE_ENV === 'production';
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const DUMMY = bcrypt.hashSync('timing-equaliser', 12); // same cost whether or not the email exists
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' } });
const ck = (p, ms) => ({ httpOnly: true, sameSite: 'strict', secure: prod, path: p, maxAge: ms });

// Access token (15 min) + rotating refresh token (7 days), both in httpOnly cookies.
async function issue(res, a) {
  const access = jwt.sign({ role: a.role }, secrets.ACCESS, { algorithm: 'HS256', subject: String(a.id), expiresIn: '15m' });
  const jti = crypto.randomUUID();
  const refresh = jwt.sign({ jti }, secrets.REFRESH, { algorithm: 'HS256', subject: String(a.id), expiresIn: '7d' });
  await db.execute('INSERT INTO refresh_tokens (token_hash,admin_id,expires_at) VALUES (?,?,DATE_ADD(NOW(), INTERVAL 7 DAY))', [sha(jti), a.id]);
  res.cookie('vs_access', access, ck('/api', 15 * 60 * 1000));
  res.cookie('vs_refresh', refresh, ck('/api/admin', 7 * 24 * 3600 * 1000));
}
const ah = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(csrf);

router.post('/login', loginLimiter, ah(async (req, res) => {
  const email = String(req.body.email || '').toLowerCase().slice(0, 120);
  const pw = String(req.body.password || '').slice(0, 200);
  const [rows] = await db.execute('SELECT id,email,password_hash,role FROM admins WHERE email=?', [email]);
  const a = rows[0];
  const ok = await bcrypt.compare(pw, a ? a.password_hash : DUMMY);
  if (!a || !ok) return res.status(401).json({ message: 'Invalid email or password.' });
  await issue(res, a);
  res.json({ email: a.email, role: a.role });
}));

router.post('/refresh', ah(async (req, res) => {
  let p;
  try { p = jwt.verify(req.cookies.vs_refresh || '', secrets.REFRESH, { algorithms: ['HS256'] }); }
  catch { return res.status(401).json({ message: 'Session expired.' }); }
  const h = sha(p.jti);
  const [rows] = await db.execute('SELECT revoked FROM refresh_tokens WHERE token_hash=? AND admin_id=?', [h, p.sub]);
  if (!rows[0]) return res.status(401).json({ message: 'Session expired.' });
  if (rows[0].revoked) { // token reuse detected: kill every session of this admin
    await db.execute('UPDATE refresh_tokens SET revoked=1 WHERE admin_id=?', [p.sub]);
    return res.status(401).json({ message: 'Session expired.' });
  }
  await db.execute('UPDATE refresh_tokens SET revoked=1 WHERE token_hash=?', [h]); // rotation
  const [a] = await db.execute('SELECT id,email,role FROM admins WHERE id=?', [p.sub]);
  if (!a[0]) return res.status(401).json({ message: 'Session expired.' });
  await issue(res, a[0]);
  res.json({ email: a[0].email, role: a[0].role });
}));

router.post('/logout', ah(async (req, res) => {
  try {
    const p = jwt.verify(req.cookies.vs_refresh || '', secrets.REFRESH, { algorithms: ['HS256'] });
    await db.execute('UPDATE refresh_tokens SET revoked=1 WHERE token_hash=?', [sha(p.jti)]);
  } catch { /* already logged out */ }
  res.clearCookie('vs_access', { path: '/api' });
  res.clearCookie('vs_refresh', { path: '/api/admin' });
  res.json({ ok: true });
}));

// ---- everything below needs a valid access token ----
router.use(requireAuth);

router.get('/me', (req, res) => res.json({ role: req.admin.role }));

router.get('/registrations', ah(async (req, res) => {
  const status = ['pending', 'verified', 'rejected'].includes(req.query.status) ? req.query.status : null;
  const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 60) : '';
  const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;
  const [rows] = await db.execute(
    `SELECT id,reference,full_name,email,phone,university,department,semester,team_name,member2_name,transaction_id,receipt_mime,status,rank_pos,score,remark,created_at
     FROM registrations WHERE (? IS NULL OR status=?) AND (full_name LIKE ? OR email LIKE ? OR reference LIKE ? OR transaction_id LIKE ?)
     ORDER BY id DESC LIMIT 2000`, [status, status, like, like, like, like]);
  res.json(rows);
}));

router.get('/registrations/:id/receipt', ah(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Bad id.' });
  const [rows] = await db.execute('SELECT reference,receipt_file,receipt_mime,receipt_data FROM registrations WHERE id=?', [id]);
  const r = rows[0];
  if (!r || !/^[a-f0-9]{32}\.(jpg|png|pdf)$/.test(r.receipt_file)) return res.status(404).json({ message: 'Not found.' });
  res.set({ 'Content-Type': r.receipt_mime, 'Content-Disposition': `inline; filename="${r.reference}-receipt.${r.receipt_file.split('.')[1]}"`, 'Cache-Control': 'private, no-store' });
  if (r.receipt_data) return res.send(r.receipt_data);
  res.sendFile(r.receipt_file, { root: DIR, dotfiles: 'deny' });
}));

router.patch('/registrations/:id', ah(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  const status = req.body.status;
  if (!Number.isInteger(id) || !['pending', 'verified', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid request.' });
  const [r] = await db.execute('UPDATE registrations SET status=? WHERE id=?', [status, id]);
  if (!r.affectedRows) return res.status(404).json({ message: 'Not found.' });
  res.json({ id, status });
}));

router.delete('/registrations/:id', requireRole('superadmin'), ah(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Bad id.' });
  const [rows] = await db.execute('SELECT receipt_file FROM registrations WHERE id=?', [id]);
  if (!rows[0]) return res.status(404).json({ message: 'Not found.' });
  await db.execute('DELETE FROM registrations WHERE id=?', [id]);
  await removeReceipt(rows[0].receipt_file);
  res.json({ ok: true });
}));

// ---------- dashboard stats, settings (Drive link), links, results ----------
const isUrl = (s) => { try { const u = new URL(s); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; } };

router.get('/stats', ah(async (req, res) => {
  const [[s]] = await db.execute(
    "SELECT COUNT(*) total, SUM(status='verified') verified, SUM(status='pending') pending, SUM(status='rejected') rejected FROM registrations");
  res.json({ total: +s.total || 0, verified: +s.verified || 0, pending: +s.pending || 0, rejected: +s.rejected || 0 });
}));

router.get('/settings', ah(async (req, res) => {
  res.json({
    driveLink: await getSetting('drive_link', ''),
    resultsPublished: (await getSetting('results_published', '0')) === '1',
  });
}));
router.put('/settings', requireRole('superadmin'), ah(async (req, res) => {
  const v = String(req.body.driveLink == null ? '' : req.body.driveLink).trim();
  if (v && (!isUrl(v) || v.length > 500)) return res.status(400).json({ message: 'Enter a valid link starting with https://' });
  await setSetting('drive_link', v);
  res.json({ ok: true });
}));

router.get('/links', ah(async (req, res) => {
  const [rows] = await db.execute('SELECT id,label,url,is_public FROM vs_links ORDER BY id');
  res.json(rows);
}));
router.post('/links', requireRole('superadmin'), ah(async (req, res) => {
  const label = String(req.body.label || '').trim().slice(0, 80);
  const url = String(req.body.url || '').trim();
  if (!label) return res.status(400).json({ message: 'Give the link a name.' });
  if (!isUrl(url) || url.length > 500) return res.status(400).json({ message: 'Enter a valid link starting with https://' });
  await db.execute('INSERT INTO vs_links (label,url,is_public) VALUES (?,?,?)', [label, url, req.body.isPublic ? 1 : 0]);
  res.status(201).json({ ok: true });
}));
router.delete('/links/:id', requireRole('superadmin'), ah(async (req, res) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Bad id.' });
  await db.execute('DELETE FROM vs_links WHERE id=?', [id]);
  res.json({ ok: true });
}));

router.put('/results', requireRole('superadmin'), ah(async (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || items.length > 2000) return res.status(400).json({ message: 'Invalid data.' });
  const clean = [];
  for (const it of items) {
    const id = Number.parseInt(it.id, 10);
    const rank = it.rank === '' || it.rank == null ? null : Number.parseInt(it.rank, 10);
    const score = it.score === '' || it.score == null ? null : Number(it.score);
    if (!Number.isInteger(id) || (rank !== null && !(rank >= 1 && rank <= 100000)) || (score !== null && !(score >= 0 && score <= 9999))) {
      return res.status(400).json({ message: 'Position must be 1 or more, and score must be a number.' });
    }
    const remark = String(it.remark || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 200) || null;
    clean.push([rank, score, remark, id]);
  }
  for (const c of clean) await db.execute('UPDATE registrations SET rank_pos=?, score=?, remark=? WHERE id=?', c);
  res.json({ ok: true });
}));
router.post('/results/publish', requireRole('superadmin'), ah(async (req, res) => {
  await setSetting('results_published', req.body.published ? '1' : '0');
  res.json({ ok: true });
}));

// Server-Sent Events: live "new registration" pushes to the dashboard
router.get('/stream', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write('retry: 5000\n\n');
  const send = (d) => res.write(`event: registration\ndata: ${JSON.stringify(d)}\n\n`);
  events.on('registration', send);
  const beat = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => { clearInterval(beat); events.off('registration', send); });
});
module.exports = router;
