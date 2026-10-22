const express = require('express');
const router = express.Router();
const { body, header, param, query } = require('express-validator');
const {
  createInvoice, updateInvoice, listInvoices, getInvoiceById, getInvoiceByDiagnostic,
  updateInvoiceStatus, markInvoiceAsPaid, annulInvoice
} = require('../controllers/invoiceController');
const protect = require('../middlewares/authMiddleware');
const { validate, onlyBodyFields } = require('../middlewares/validation');

const itemList = body('items').isArray({ min: 1, max: 30 }).bail().custom(items => items.every(item => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
  if (Object.keys(item).some(key => !['description', 'quantity', 'unitPrice', 'price'].includes(key))) return false;
  const price = item.unitPrice === undefined ? item.price : item.unitPrice;
  const quantity = item.quantity === undefined ? 1 : Number(item.quantity);
  const amount = Number(price);
  return typeof item.description === 'string' && item.description.trim().length > 0 && item.description.trim().length <= 200 &&
    Number.isInteger(quantity) && quantity >= 1 && quantity <= 1000 &&
    Number.isFinite(amount) && amount >= 0 && amount <= 1000000 &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 0.00001;
})).withMessage('Los ítems deben incluir descripción, cantidad válida y precio con máximo dos decimales');

const diagnosticId = body('diagnosticId').optional().isMongoId();
const ticketData = body('ticket').custom((ticket, { req }) => {
  if (req.body.diagnosticId !== undefined) return ticket === undefined;
  if (!ticket || typeof ticket !== 'object' || Array.isArray(ticket)) return false;
  const allowed = ['brand', 'model', 'issue', 'customerName', 'customerContact'];
  const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
  return Object.keys(ticket).every(key => allowed.includes(key)) &&
    text(ticket.brand, 80) && (ticket.model === undefined || (typeof ticket.model === 'string' && ticket.model.trim().length <= 100)) &&
    text(ticket.issue, 1500) && text(ticket.customerName, 120) && text(ticket.customerContact, 120);
}).withMessage('Los datos del ticket son obligatorios y deben ser válidos');
const optionalNotes = body('notes').optional().isString().trim().isLength({ max: 1000 });
const optionalDiscount = body('discountCents').optional().isInt({ min: 0, max: 3000000000 }).toInt();
const invoiceId = param('id').isMongoId();
const idempotencyHeader = header('idempotency-key').custom((value, { req }) => {
  // El alias inglés tolera clientes antiguos; la ruta principal exige idempotencia.
  if (req.baseUrl === '/api/invoices' && value === undefined) return true;
  return typeof value === 'string' && /^[\w-]{8,80}$/.test(value);
}).withMessage('Falta una clave de idempotencia válida');

router.use(protect);

router.get('/',
  query('page').optional().isInt({ min: 1, max: 1000000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 4 }).toInt(),
  query('search').optional().isString().trim().isLength({ max: 100 }),
  query('status').optional().isIn(['pendiente', 'pagada', 'anulada']), validate, listInvoices);
router.post('/', onlyBodyFields(['diagnosticId', 'ticket', 'items', 'discountCents', 'notes']),
  diagnosticId, ticketData, itemList, optionalDiscount, optionalNotes,
  idempotencyHeader, validate, createInvoice);
router.get('/diagnostic/:diagnosticId', param('diagnosticId').isMongoId(), validate, getInvoiceByDiagnostic);
router.get('/:id', invoiceId, validate, getInvoiceById);
router.put('/:id', invoiceId, onlyBodyFields(['items', 'discountCents', 'notes']), itemList,
  optionalDiscount, optionalNotes, validate, updateInvoice);
router.patch('/:id', invoiceId, onlyBodyFields(['status', 'paymentMethod', 'notes', 'customerName']),
  body('status').optional().isIn(['pendiente', 'pagada']),
  body('paymentMethod').optional({ values: 'null' }).isIn(['efectivo', 'tarjeta', 'transferencia', 'otro']),
  body('notes').optional().isString().trim().isLength({ max: 1000 }),
  body('customerName').optional().isString().trim().isLength({ min: 1, max: 120 }), validate, updateInvoiceStatus);
router.patch('/:id/pay', invoiceId, validate, markInvoiceAsPaid);
router.delete('/:id', invoiceId, validate, annulInvoice);

module.exports = router;
