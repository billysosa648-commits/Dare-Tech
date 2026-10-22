const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({ message: 'Solicitud inválida', errors: result.array({ onlyFirstError: true }).map(({ path, msg }) => ({ field: path, message: msg })) });
  }
  next();
}

function onlyBodyFields(allowedFields) {
  const allowed = new Set(allowedFields);
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ message: 'Cuerpo de solicitud inválido' });
    }
    if (Object.keys(req.body).some(field => !allowed.has(field))) {
      return res.status(400).json({ message: 'La solicitud contiene campos no permitidos' });
    }
    return next();
  };
}

module.exports = { validate, onlyBodyFields };
