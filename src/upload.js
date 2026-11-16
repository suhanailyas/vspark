// Secure receipt upload: memory buffer -> check real file signature -> random filename -> private folder.
const multer = require('multer');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const DIR = path.join(__dirname, '..', 'private_uploads'); // NOT inside /public
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 20 } });

function detect(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 4) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return { ext: 'png', mime: 'image/png' };
  if (buf.subarray(0, 4).toString('latin1') === '%PDF') return { ext: 'pdf', mime: 'application/pdf' };
  return null;
}
async function saveReceipt(buf) {
  const t = detect(buf);
  if (!t) return null;
  await fs.mkdir(DIR, { recursive: true });
  const name = crypto.randomBytes(16).toString('hex') + '.' + t.ext;
  await fs.writeFile(path.join(DIR, name), buf, { flag: 'wx' });
  return { name, mime: t.mime };
}
const removeReceipt = (name) => fs.unlink(path.join(DIR, path.basename(name))).catch(() => {});
module.exports = { upload, detect, saveReceipt, removeReceipt, DIR };
