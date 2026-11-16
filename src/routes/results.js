// Public results: nothing is visible until the admin presses Publish. No email/phone is ever exposed.
const router = require('express').Router();
const db = require('../db');
const { getSetting } = require('../settings');

router.get('/', async (req, res, next) => {
  try {
    res.set('Cache-Control', 'no-store');
    if ((await getSetting('results_published', '0')) !== '1') return res.json({ published: false, results: [] });
    const [rows] = await db.execute(
      'SELECT rank_pos AS position, full_name, university, team_name, score, remark FROM registrations WHERE rank_pos IS NOT NULL ORDER BY rank_pos ASC, score DESC, full_name ASC');
    res.json({ published: true, results: rows });
  } catch (e) { next(e); }
});
module.exports = router;
