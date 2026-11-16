// Usage: npm run seed:admin -- you@example.com "StrongPassword123" superadmin
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');

(async () => {
  const [email, password, role = 'superadmin'] = process.argv.slice(2);
  if (!email || !password || password.length < 10 || !['superadmin', 'reviewer'].includes(role)) {
    console.error('Usage: npm run seed:admin -- <email> <password min 10 chars> [superadmin|reviewer]');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 12);
  await db.execute('INSERT INTO admins (email,password_hash,role) VALUES (?,?,?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role=VALUES(role)', [email.toLowerCase(), hash, role]);
  console.log(`Admin ${email} saved as ${role}.`);
  process.exit(0);
})().catch((e) => { console.error(e.message); process.exit(1); });
