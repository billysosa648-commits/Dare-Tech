const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { createDiagnostic, getAllDiagnostics, getReceivedReports, updateDiagnosticStatus, trackByTicket } = require('../controllers/diagnosticController');
const protect = require('../middlewares/authMiddleware');
const { validate, onlyBodyFields } = require('../middlewares/validation');
const adminRateLimiter = require('../middlewares/adminRateLimiter');
const { validateFormTiming, verifyTurnstile, enforceContactLimits } = require('../middlewares/diagnosticAbuse');
const { deleteDiagnostic, bulkDeleteDiagnostics } = require('../controllers/deletionController');

const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Demasiadas solicitudes. Intenta más tarde.' } });
// Separa el control de creación del límite menos estricto de seguimiento público.
const createHourLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: Math.max(1, Number(process.env.DIAGNOSTIC_RATE_LIMIT_HOURLY || 5)), standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'No se pudo procesar el reporte. Intenta nuevamente más tarde.' } });
// Impone un máximo diario adicional por IP para la creación de diagnósticos.
const createDayLimiter = rateLimit({ windowMs: 24 * 60 * 60 * 1000, limit: Math.max(1, Number(process.env.DIAGNOSTIC_RATE_LIMIT_DAILY || 20)), standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'No se pudo procesar el reporte. Intenta nuevamente más tarde.' } });
// Crea una regla de texto obligatoria con límites de longitud.
const requiredText = (field, max) => body(field).isString().withMessage('Texto inválido').bail().trim().isLength({ min: 1, max }).withMessage('Longitud de texto inválida');

// Valida el formulario público antes de aplicar los controles antispam.
router.post('/', createHourLimiter, createDayLimiter, onlyBodyFields(['brand', 'model', 'issue', 'customerName', 'customerContact', 'website', 'formStartedAt', 'turnstileToken']),
  requiredText('brand', 80), body('model').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }),
  requiredText('issue', 1500), requiredText('customerName', 120), requiredText('customerContact', 120),
  body('website').isString().isLength({ max: 200 }), body('formStartedAt').isNumeric(),
  body('turnstileToken').optional({ values: 'falsy' }).isString().isLength({ max: 2048 }),
  validate, validateFormTiming, verifyTurnstile, enforceContactLimits, createDiagnostic);
// Permite consultar el seguimiento público sin exigir sesión administrativa.
router.get('/track/:ticketNumber', publicLimiter, param('ticketNumber').isString().matches(/^DT-\d{5,10}$/i), validate, trackByTicket);
// Protege y limita las operaciones administrativas de diagnósticos.
router.use(protect, adminRateLimiter);
// Lista diagnósticos y reportes para el panel administrativo.
router.get('/', getAllDiagnostics);
// Lista los reportes recibidos con paginación.
router.get('/received', query('page').optional().isInt({ min: 1, max: 100000 }), query('limit').optional().isInt({ min: 1, max: 2 }), validate, getReceivedReports);
// Actualiza el estado y el historial de un diagnóstico.
router.patch('/:id/status', onlyBodyFields(['status', 'note']), param('id').isMongoId(), body('status').isIn(['recibido', 'en_revision', 'reparado', 'entregado']), body('note').optional().isString().trim().isLength({ max: 300 }), validate, updateDiagnosticStatus);
// Elimina diagnósticos seleccionados con verificación de facturas asociadas.
router.post('/bulk-delete', onlyBodyFields(['ids', 'withInvoices']), body('ids').isArray({ min: 1, max: 100 }), body('ids.*').isMongoId(), body('withInvoices').optional().isBoolean().toBoolean(), validate, bulkDeleteDiagnostics);
// Elimina un diagnóstico y exige autorización explícita para borrar sus facturas.
router.delete('/:id', param('id').isMongoId(), query('withInvoices').optional().isIn(['true', 'false']), validate, deleteDiagnostic);

module.exports = router;
