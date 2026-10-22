const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { registerAdmin, login, logout, changePassword } = require('../controllers/authController');
const protect = require('../middlewares/authMiddleware');
const { validate, onlyBodyFields } = require('../middlewares/validation');

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Demasiados intentos. Intenta nuevamente en 15 minutos.' } });
const loginUsername = body('username').isString().withMessage('Usuario inválido').bail().trim().isLength({ min: 1, max: 40 }).withMessage('Usuario inválido');
const bootstrapUsername = body('username').isString().withMessage('Usuario inválido').bail().trim()
  .isLength({ min: 3, max: 40 }).withMessage('El usuario debe tener entre 3 y 40 caracteres')
  .matches(/^[\p{L}\p{N}._-]+$/u).withMessage('El usuario contiene caracteres no permitidos');
const loginPassword = body('password').isString().withMessage('Contraseña inválida').bail()
  .isLength({ min: 1, max: 72 }).withMessage('Contraseña inválida')
  .bail().custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('Contraseña inválida');
const newPassword = body('password').isString().bail()
  .isLength({ min: 12, max: 72 }).withMessage('La contraseña debe tener entre 12 y 72 caracteres')
  .bail().custom(value => Buffer.byteLength(value, 'utf8') <= 72).withMessage('La contraseña es demasiado larga');

router.post('/register', authLimiter, onlyBodyFields(['username', 'password']), bootstrapUsername, newPassword, validate, registerAdmin);
router.post('/login', authLimiter, onlyBodyFields(['username', 'password']), loginUsername, loginPassword, validate, login);
router.post('/logout', protect, logout);
router.put('/password', protect, onlyBodyFields(['password']), newPassword, validate, changePassword);

module.exports = router;
