const express = require('express');
const router = express.Router();
const { createInvoice, getInvoiceByDiagnostic, markInvoiceAsPaid } = require('../controllers/invoiceController');
const protect = require('../middlewares/authMiddleware');

router.post('/', protect, createInvoice);
router.get('/diagnostic/:diagnosticId', getInvoiceByDiagnostic);
router.patch('/:id/pay', protect, markInvoiceAsPaid);

module.exports = router;