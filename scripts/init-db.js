// Runs before the server on every start (npm start). Never blocks the server from starting.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const { migrate } = require('../src/migrate');

(async () => {
  for (let i = 1; i <= 8; i++) {
    try {
      await migrate(db);
      console.log('Tables ready.');
      const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
      const pw = process.env.ADMIN_PASSWORD || '';
      if (email && pw.length >= 8) {
        const hash = await bcrypt.hash(pw, 12);
        await db.execute(
          "INSERT INTO admins (email,password_hash,role) VALUES (?,?,'superadmin') ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role='superadmin'",
          [email, hash]);
        console.log('Admin ready: ' + email);
      }
      process.exit(0);
    } catch (e) {
      console.error(`init-db try ${i}/8 failed: ${e.code || ''} ${e.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.error('init-db could not finish. Starting the server anyway. Check the DB variables.');
  process.exit(0);
})();
