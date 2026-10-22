const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { createDiagnostic, getAllDiagnostics, getReceivedReports, updateDiagnosticStatus, trackByTicket } = require('../controllers/diagnosticController');
const protect = require('../middlewares/authMiddleware');
const { validate, onlyBodyFields } = require('../middlewares/validation');

const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Demasiadas solicitudes. Intenta más tarde.' } });
const requiredText = (field, max) => body(field).isString().withMessage('Texto inválido').bail().trim().isLength({ min: 1, max }).withMessage('Longitud de texto inválida');

router.post('/', publicLimiter, onlyBodyFields(['brand', 'model', 'issue', 'customerName', 'customerContact']),
  requiredText('brand', 80), body('model').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
  requiredText('issue', 1500), requiredText('customerName', 120), requiredText('customerContact', 120), validate, createDiagnostic);
router.get('/', protect, getAllDiagnostics);
router.get('/received', protect, query('page').optional().isInt({ min: 1, max: 100000 }), query('limit').optional().isInt({ min: 1, max: 2 }), validate, getReceivedReports);
router.get('/track/:ticketNumber', publicLimiter, param('ticketNumber').isString().matches(/^DT-\d{5,10}$/i), validate, trackByTicket);
router.patch('/:id/status', protect, onlyBodyFields(['status', 'note']), param('id').isMongoId(), body('status').isIn(['recibido', 'en_revision', 'reparado', 'entregado']), body('note').optional().isString().trim().isLength({ max: 300 }), validate, updateDiagnosticStatus);

module.exports = router;
