// Participant portal: sign in with email + reference number (e.g. VS-PE-0001).
const router = require('express').Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const secrets = require('../secrets');
const { csrf } = require('../middleware/auth');
const { getSetting } = require('../settings');

const prod = process.env.NODE_ENV === 'production';
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many attempts. Try again in 15 minutes.' } });
const ah = (fn) => (req, res, next) => fn(req, res, next).catch(next);

router.use(csrf);

router.post('/login', limiter, ah(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase().slice(0, 120);
  const ref = String(req.body.reference || '').trim().toUpperCase().slice(0, 20);
  const [rows] = await db.execute('SELECT id FROM registrations WHERE email=? AND reference=?', [email, ref]);
  if (!rows[0]) return res.status(401).json({ message: 'Email or reference number is incorrect.' });
  const token = jwt.sign({}, secrets.ACCESS, { algorithm: 'HS256', subject: String(rows[0].id), audience: 'portal', expiresIn: '7d' });
  res.cookie('vs_portal', token, { httpOnly: true, sameSite: 'strict', secure: prod, path: '/api/portal', maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ ok: true });
}));

router.post('/logout', (req, res) => { res.clearCookie('vs_portal', { path: '/api/portal' }); res.json({ ok: true }); });

router.get('/me', ah(async (req, res) => {
  let id;
  try { id = Number(jwt.verify(req.cookies.vs_portal || '', secrets.ACCESS, { algorithms: ['HS256'], audience: 'portal' }).sub); }
  catch { return res.status(401).json({ message: 'Please sign in.' }); }
  const [rows] = await db.execute(
    'SELECT reference,full_name,email,university,department,team_name,member2_name,status,rank_pos,score,remark FROM registrations WHERE id=?', [id]);
  const p = rows[0];
  if (!p) { res.clearCookie('vs_portal', { path: '/api/portal' }); return res.status(401).json({ message: 'Account not found.' }); }
  const published = (await getSetting('results_published', '0')) === '1';
  const [links] = await db.execute('SELECT label,url FROM vs_links WHERE is_public=1 ORDER BY id');
  res.set('Cache-Control', 'no-store');
  res.json({
    participant: { reference: p.reference, name: p.full_name, email: p.email, university: p.university, department: p.department, team: p.team_name, member2: p.member2_name, status: p.status },
    driveLink: await getSetting('drive_link', ''),
    links,
    resultsPublished: published,
    result: published && p.rank_pos !== null ? { position: p.rank_pos, score: p.score, remark: p.remark } : null,
  });
}));
module.exports = router;
