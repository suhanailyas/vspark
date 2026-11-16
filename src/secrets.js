// JWT secrets from .env / Railway Variables. If missing, a temporary random one is used
// (the server still starts; people just have to log in again after each restart).
const crypto = require('crypto');
function get(k) {
  const v = process.env[k];
  if (v && v.length >= 32) return v;
  console.warn(`WARNING: ${k} is missing or shorter than 32 chars. Using a temporary secret (logins reset on restart).`);
  return crypto.randomBytes(48).toString('hex');
}
module.exports = { ACCESS: get('ACCESS_SECRET'), REFRESH: get('REFRESH_SECRET') };
