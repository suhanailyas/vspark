// Works with local XAMPP/Laragon (DB_*) and Railway (MYSQL_URL or MYSQL* variables).
const mysql = require('mysql2/promise');
const e = process.env;
const url = e.MYSQL_URL || e.DATABASE_URL || e.MYSQL_PUBLIC_URL;

let pool;
if (!e.DB_HOST && url) {
  pool = mysql.createPool(url);
} else {
  pool = mysql.createPool({
    host: e.DB_HOST || e.MYSQLHOST || 'localhost',
    port: Number(e.DB_PORT || e.MYSQLPORT || 3306),
    user: e.DB_USER || e.MYSQLUSER || 'root',
    password: e.DB_PASSWORD || e.DB_PASS || e.MYSQLPASSWORD || '',
    database: e.DB_NAME || e.DB_DATABASE || e.MYSQLDATABASE || 'vspark',
    waitForConnections: true,
    connectionLimit: 10,
  });
}
module.exports = pool;
