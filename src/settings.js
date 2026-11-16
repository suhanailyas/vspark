const db = require('./db');
async function getSetting(k, def = '') {
  const [rows] = await db.execute('SELECT v FROM vs_settings WHERE k=?', [k]);
  return rows[0] && rows[0].v !== null ? rows[0].v : def;
}
async function setSetting(k, v) {
  await db.execute('INSERT INTO vs_settings (k,v) VALUES (?,?) ON DUPLICATE KEY UPDATE v=VALUES(v)', [k, v]);
}
module.exports = { getSetting, setSetting };
