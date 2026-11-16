// Define el CRUD protegido de preguntas frecuentes para el panel admin.
const express = require('express');
const { body, param } = require('express-validator');
const protect = require('../middlewares/authMiddleware');
const adminRateLimiter = require('../middlewares/adminRateLimiter');
const { validate, onlyBodyFields } = require('../middlewares/validation');
const { listFaqs, createFaq, updateFaq, deleteFaq, reorderFaqs } = require('../controllers/faqController');

// Limita las operaciones de administración de FAQs tras validar el JWT.
const router = express.Router();
router.use(protect, adminRateLimiter);
const fields = ['question', 'answer', 'keywords', 'category', 'active', 'order'];
// Construye reglas reutilizables para campos opcionales de una FAQ.
const validateFaqFields = () => [
  body('question').optional().isString().trim().isLength({ min: 1, max: 200 }),
  body('answer').optional().isString().trim().isLength({ min: 1, max: 1500 }),
  body('keywords').optional().isArray({ max: 20 }), body('keywords.*').optional().isString().trim().isLength({ min: 1, max: 50 }),
  body('category').optional().isString().trim().isLength({ min: 1, max: 50 }),
  body('active').optional().isBoolean().toBoolean(), body('order').optional().isInt({ min: 0, max: 10000 }).toInt()
];

// Lista las FAQs ordenadas para que el panel las muestre.
router.get('/', listFaqs);
// Crea una FAQ validando campos permitidos y contenido mínimo.
router.post('/', onlyBodyFields(fields), body('question').isString().trim().isLength({ min: 1, max: 200 }), body('answer').isString().trim().isLength({ min: 1, max: 1500 }), body('category').isString().trim().isLength({ min: 1, max: 50 }), ...validateFaqFields(), validate, createFaq);
// Reordena preguntas mediante un lote acotado de IDs y posiciones.
router.patch('/reorder', onlyBodyFields(['items']), body('items').isArray({ min: 1, max: 100 }), body('items.*.id').isMongoId(), body('items.*.order').isInt({ min: 0, max: 10000 }), validate, reorderFaqs);
// Actualiza una FAQ existente sin permitir campos adicionales.
router.patch('/:id', param('id').isMongoId(), onlyBodyFields(fields), ...validateFaqFields(), validate, updateFaq);
// Elimina una FAQ seleccionada por ID.
router.delete('/:id', param('id').isMongoId(), validate, deleteFaq);

// Exporta las rutas CRUD protegidas.
module.exports = router;
