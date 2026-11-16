const jwt = require('jsonwebtoken');
const secrets = require('../secrets');

function requireAuth(req, res, next) {
  try {
    const p = jwt.verify(req.cookies.vs_access || '', secrets.ACCESS, { algorithms: ['HS256'] });
    req.admin = { id: p.sub, role: p.role };
    next();
  } catch {
    res.status(401).json({ message: 'Authentication required.' });
  }
}
// RBAC
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.admin.role) ? next() : res.status(403).json({ message: 'You do not have permission for this action.' });

// CSRF defence (with SameSite=Strict cookies): state-changing requests need a custom header,
// which a cross-site form cannot send and a cross-origin fetch cannot send without a CORS preflight.
function csrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'XMLHttpRequest') return res.status(403).json({ message: 'Request blocked.' });
  next();
}
module.exports = { requireAuth, requireRole, csrf };
