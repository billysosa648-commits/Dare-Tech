const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

async function protect(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !/^Bearer\s+\S+$/.test(authHeader)) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  let decoded;
  try {
    decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET, {
      algorithms: ['HS256'], issuer: 'dare-tech-api', audience: 'dare-tech-admin'
    });
  } catch {
    return res.status(401).json({ message: 'Sesión inválida o expirada' });
  }

  try {
    const admin = await Admin.findById(decoded.id).select('role tokenVersion passwordChangeRequired');
    if (!admin || admin.role !== 'admin' || (admin.tokenVersion || 0) !== decoded.tokenVersion) {
      return res.status(401).json({ message: 'Sesión inválida o expirada' });
    }
    if (admin.passwordChangeRequired && !(req.method === 'PUT' && req.baseUrl === '/api/auth' && req.path === '/password')) {
      return res.status(403).json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Debes actualizar tu contraseña para continuar' });
    }
    req.admin = { id: decoded.id, role: admin.role };
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = protect;
