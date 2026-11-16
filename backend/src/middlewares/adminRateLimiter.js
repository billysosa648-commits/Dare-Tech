// Limita solicitudes administrativas por IP después de autenticar al administrador.
const rateLimit = require('express-rate-limit');

// Configura límites protectores para rutas de escritura y lectura del panel.
module.exports = rateLimit({
  windowMs: Math.max(1000, Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS || 60_000)),
  limit: Math.max(1, Number(process.env.ADMIN_RATE_LIMIT_MAX || 100)),
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { message: 'Límite de solicitudes administrativas alcanzado. Intenta más tarde.' }
});
