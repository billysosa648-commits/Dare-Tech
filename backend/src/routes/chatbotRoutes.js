// Define el endpoint público y limitado para responder preguntas frecuentes.
const express = require('express');
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const { answerQuestion } = require('../controllers/chatbotController');
const { validate, onlyBodyFields } = require('../middlewares/validation');

// Limita consultas al chatbot de forma independiente de otros endpoints públicos.
const chatbotLimiter = rateLimit({
  windowMs: Math.max(1000, Number(process.env.CHATBOT_RATE_LIMIT_WINDOW_MS || 60_000)),
  limit: Math.max(1, Number(process.env.CHATBOT_RATE_LIMIT_MAX || 20)),
  standardHeaders: 'draft-8', legacyHeaders: false,
  message: { message: 'Se alcanzó el límite de consultas. Intenta más tarde.' }
});

// Valida preguntas de uno a trescientos caracteres.
const router = express.Router();
router.post('/', chatbotLimiter, onlyBodyFields(['message']), body('message').isString().trim().isLength({ min: 1, max: 300 }), validate, answerQuestion);

// Exporta el router público del chatbot.
module.exports = router;
