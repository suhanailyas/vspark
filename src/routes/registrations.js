const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const db = require('../db');
const events = require('../events');
const crypto = require('crypto');
const { upload, detect } = require('../upload');
const { validateRegistration } = require('../validate');

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' } });

router.post('/', limiter, upload.single('receipt'), async (req, res, next) => {
  try {
    const { data, errors } = validateRegistration(req.body || {});
    if (!req.file) errors.receipt = 'Payment receipt is required.';
    if (Object.keys(errors).length) return res.status(422).json({ message: 'Please correct the highlighted fields.', errors });

    const kind = detect(req.file.buffer);
    if (!kind) return res.status(422).json({ message: 'Receipt must be a real JPG, PNG or PDF file.', errors: { receipt: 'Invalid file type.' } });

    try {
      // Receipt is stored inside the database (Railway's disk is wiped on every deploy).
      const fileName = crypto.randomBytes(16).toString('hex') + '.' + kind.ext;
      const [r] = await db.execute(
        `INSERT INTO registrations (full_name,email,phone,university,department,semester,team_name,member2_name,transaction_id,receipt_file,receipt_mime,receipt_data)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [data.full_name, data.email, data.phone, data.university, data.department, data.semester,
         data.team_name, data.member2_name, data.transaction_id, fileName, kind.mime, req.file.buffer]);
      const reference = 'VS-PE-' + String(r.insertId).padStart(4, '0');
      await db.execute('UPDATE registrations SET reference=? WHERE id=?', [reference, r.insertId]);
      events.emit('registration', { reference, full_name: data.full_name });
      res.status(201).json({ reference, status: 'pending' }); // only after the row is really saved
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This email or transaction ID is already registered.' });
      throw err;
    }
  } catch (err) { next(err); }
});
module.exports = router;
