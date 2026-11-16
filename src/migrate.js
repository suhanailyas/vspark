// Safe to run on every start: creates missing tables / columns, never deletes anything.
const TABLES = [
  `CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role ENUM('superadmin','reviewer') NOT NULL DEFAULT 'reviewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(20) UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    university VARCHAR(120) NOT NULL,
    department VARCHAR(100) NOT NULL,
    semester CHAR(1) NOT NULL,
    team_name VARCHAR(80) NOT NULL DEFAULT '',
    member2_name VARCHAR(100) NOT NULL DEFAULT '',
    transaction_id VARCHAR(64) NOT NULL UNIQUE,
    receipt_file VARCHAR(80) NOT NULL,
    receipt_mime VARCHAR(30) NOT NULL,
    status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (status)
  )`,
  `CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_hash CHAR(64) PRIMARY KEY,
    admin_id INT NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS vs_settings (
    k VARCHAR(50) PRIMARY KEY,
    v TEXT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS vs_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    label VARCHAR(80) NOT NULL,
    url VARCHAR(500) NOT NULL,
    is_public TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
];
const COLUMNS = [
  ['registrations', 'receipt_data', 'LONGBLOB NULL'], // receipts live in the DB (Railway disk is temporary)
  ['registrations', 'rank_pos', 'INT NULL'],
  ['registrations', 'score', 'DECIMAL(6,2) NULL'],
  ['registrations', 'remark', 'VARCHAR(200) NULL'],
];

async function migrate(db) {
  for (const sql of TABLES) await db.query(sql);
  for (const [t, c, def] of COLUMNS) {
    const [r] = await db.query(
      'SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [t, c]);
    if (!Number(r[0].n)) await db.query(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`);
  }
}
module.exports = { migrate };
