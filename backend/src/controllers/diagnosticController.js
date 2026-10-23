const Diagnostic = require('../models/Diagnostic');
const Invoice = require('../models/Invoice');
const { serializeInvoice } = require('./invoiceController');
const createTicket = require('../services/ticketService');

async function createDiagnostic(req, res) {
  try {
    const { brand, model, issue, customerName, customerContact } = req.body;
    const diagnostic = await createTicket({ brand, model, issue, customerName, customerContact });
    res.status(201).json(diagnostic);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'No se pudo generar el ticket. Intenta nuevamente.' });
    console.error('Error al guardar diagnóstico:', error.message);
    res.status(500).json({ message: 'No se pudo guardar el diagnóstico' });
  }
}

async function getAllDiagnostics(req, res) {
  try {
    const diagnostics = await Diagnostic.find().sort({ createdAt: -1 }).lean();
    const invoices = diagnostics.length
      ? await Invoice.find({ diagnosticId: { $in: diagnostics.map(({ _id }) => _id) } })
        .sort({ createdAt: -1, _id: -1 }).lean()
      : [];
    const invoicesByDiagnostic = new Map();
    invoices.forEach(invoice => {
      const key = invoice.diagnosticId.toString();
      if (!invoicesByDiagnostic.has(key)) invoicesByDiagnostic.set(key, []);
      invoicesByDiagnostic.get(key).push(serializeInvoice(invoice));
    });
    res.json(diagnostics.map(diagnostic => ({
      ...diagnostic,
      invoices: invoicesByDiagnostic.get(diagnostic._id.toString()) || [],
      invoice: (invoicesByDiagnostic.get(diagnostic._id.toString()) || []).find(invoice => invoice.status !== 'anulada') || null
    })));
  } catch (error) {
    console.error('Error al obtener diagnósticos:', error.message);
    res.status(500).json({ message: 'No se pudieron obtener los diagnósticos' });
  }
}

async function getReceivedReports(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Math.min(2, Math.max(1, Number(req.query.limit) || 2));
    const [reports, total] = await Promise.all([
      Diagnostic.find({ origin: { $ne: 'invoice' } }).select('ticketNumber brand model issue customerName customerContact status createdAt')
        .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Diagnostic.countDocuments({ origin: { $ne: 'invoice' } })
    ]);
    res.set('Cache-Control', 'no-store, private');
    res.set('Pragma', 'no-cache');
    res.json({ items: reports, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error al obtener reportes recibidos:', error.message);
    res.status(500).json({ message: 'No se pudieron obtener los reportes' });
  }
}

async function updateDiagnosticStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const diagnostic = await Diagnostic.findById(id);
    if (!diagnostic) return res.status(404).json({ message: 'Diagnóstico no encontrado' });
    diagnostic.status = status;
    diagnostic.statusHistory.push({ status, note: note || '' });
    await diagnostic.save();
    res.json(diagnostic);
  } catch (error) {
    console.error('Error al actualizar estado:', error.message);
    res.status(500).json({ message: 'No se pudo actualizar el estado' });
  }
}

async function trackByTicket(req, res) {
  try {
    const ticketNumber = req.params.ticketNumber.toUpperCase();
    const diagnostic = await Diagnostic.findOne({ ticketNumber })
      .select('ticketNumber brand model issue status statusHistory').lean();
    if (!diagnostic) return res.status(404).json({ message: 'No se encontró ningún ticket con ese número' });

    const { _id, ...publicDiagnostic } = diagnostic;
    const invoices = (await Invoice.find({ diagnosticId: _id, status: { $ne: 'anulada' } })
      .sort({ createdAt: -1, _id: -1 }).lean()).map(invoice => serializeInvoice(invoice, { publicView: true }));
    res.set('Cache-Control', 'no-store');
    res.json({ ...publicDiagnostic, invoices, invoice: invoices[0] || null });
  } catch (error) {
    console.error('Error al consultar ticket:', error.message);
    res.status(500).json({ message: 'No se pudo consultar el ticket' });
  }
}

module.exports = { createDiagnostic, getAllDiagnostics, getReceivedReports, updateDiagnosticStatus, trackByTicket };
