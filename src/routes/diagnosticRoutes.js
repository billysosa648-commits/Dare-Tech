const express = require('express');
const router = express.Router();
const { createDiagnostic, getAllDiagnostics, updateDiagnosticStatus, trackByTicket } = require('../controllers/diagnosticController');
const protect = require('../middlewares/authMiddleware');

router.post('/', createDiagnostic);
router.get('/', protect, getAllDiagnostics);
router.get('/track/:ticketNumber', trackByTicket);
router.patch('/:id/status', protect, updateDiagnosticStatus);

module.exports = router;