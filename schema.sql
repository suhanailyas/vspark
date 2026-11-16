CREATE DATABASE IF NOT EXISTS vspark CHARACTER SET utf8mb4;
USE vspark;

CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('superadmin','reviewer') NOT NULL DEFAULT 'reviewer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS registrations (
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
  receipt_data LONGBLOB NULL,
  rank_pos INT NULL,
  score DECIMAL(6,2) NULL,
  remark VARCHAR(200) NULL,
  status ENUM('pending','verified','rejected') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (status)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_hash CHAR(64) PRIMARY KEY,
  admin_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vs_settings (
  k VARCHAR(50) PRIMARY KEY,
  v TEXT NULL
);

CREATE TABLE IF NOT EXISTS vs_links (
  id INT AUTO_INCREMENT PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  url VARCHAR(500) NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Note: `npm start` runs scripts/init-db.js which creates/updates all of this automatically.
