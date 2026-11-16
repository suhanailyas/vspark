require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const multer = require('multer');


const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: { directives: {
  defaultSrc: ["'self'"], scriptSrc: ["'self'"],
  styleSrc: ["'self'", 'https://fonts.googleapis.com'], styleSrcAttr: ["'unsafe-inline'"],
  fontSrc: ['https://fonts.gstatic.com'], imgSrc: ["'self'", 'blob:', 'data:'], connectSrc: ["'self'"],
  objectSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"],
  'upgrade-insecure-requests': null } } }));

const origins = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use('/api/registrations', cors({ origin: origins.length ? origins : false, methods: ['POST'] }));

app.use(express.json({ limit: '300kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/portal', require('./routes/portal'));
app.use('/api/results', require('./routes/results'));
app.use('/api', (req, res) => res.status(404).json({ message: 'Not found.' }));

const pub = path.join(__dirname, '..', 'public');
app.get('/admin', (req, res) => res.sendFile(path.join(pub, 'admin.html')));
app.get('/portal', (req, res) => res.sendFile(path.join(pub, 'portal.html')));
app.get('/results', (req, res) => res.sendFile(path.join(pub, 'results.html')));
app.use(express.static(pub));

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err instanceof multer.MulterError) {
    const big = err.code === 'LIMIT_FILE_SIZE';
    return res.status(big ? 413 : 400).json({ message: big ? 'File is too large. Maximum size is 5 MB.' : 'Invalid upload.' });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Malformed request.' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const port = process.env.PORT || 3000;
if (require.main === module) app.listen(port, '0.0.0.0', () => console.log(`V-Spark running on http://localhost:${port}`));
module.exports = app;
