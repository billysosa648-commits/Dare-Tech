const Diagnostic = require('../models/Diagnostic');
const Invoice = require('../models/Invoice');
const { serializeInvoice } = require('./invoiceController');
const createTicket = require('../services/ticketService');
const SpamFingerprint = require('../models/SpamFingerprint');

// Crea tickets después de que los controles públicos adjuntan sus huellas de contacto.
async function createDiagnostic(req, res) {
  try {
    const { brand, model, issue, customerName, customerContact } = req.body;
    const diagnostic = await createTicket({ brand, model, issue, customerName, customerContact, ...req.diagnosticHashes });
    const publicResult = diagnostic.toObject();
    delete publicResult.contactHash;
    delete publicResult.spamHash;
    res.status(201).json(publicResult);
  } catch (error) {
    // Libera la reserva si la escritura del ticket falla antes de crear el diagnóstico.
    if (req.diagnosticHashes?.spamHash) await SpamFingerprint.deleteOne({ _id: req.diagnosticHashes.spamHash }).catch(() => {});
    if (error.code === 11000) return res.status(409).json({ message: 'No se pudo generar el ticket. Intenta nuevamente.' });
    console.error('Error al guardar diagnóstico:', error.message);
    res.status(500).json({ message: 'No se pudo guardar el diagnóstico' });
  }
}

// Lista diagnósticos y agrupa sus facturas para el panel administrativo.
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

// Devuelve reportes recibidos con paginación acotada.
async function getReceivedReports(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const limit = Math.min(2, Math.max(1, Number(req.query.limit) || 2));
    const search = String(req.query.search || '').trim().slice(0, 100);
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = { origin: { $ne: 'invoice' } };
    if (escaped) filter.$or = ['ticketNumber', 'brand', 'model', 'issue', 'customerName', 'customerContact'].map(field => ({ [field]: new RegExp(escaped, 'i') }));
    const [reports, total] = await Promise.all([
      Diagnostic.find(filter).select('ticketNumber brand model issue customerName customerContact status createdAt')
        .sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Diagnostic.countDocuments(filter)
    ]);
    res.set('Cache-Control', 'no-store, private');
    res.set('Pragma', 'no-cache');
    res.json({ items: reports, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error al obtener reportes recibidos:', error.message);
    res.status(500).json({ message: 'No se pudieron obtener los reportes' });
  }
}

// Actualiza el estado y agrega una entrada al historial del diagnóstico.
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

// Busca el seguimiento por ticket y devuelve solo campos públicos.
async function trackByTicket(req, res) {
  try {
    const publicDiagnostic = await getPublicTicketData(req.params.ticketNumber);
    if (!publicDiagnostic) return res.status(404).json({ message: 'No se encontró ningún ticket con ese número' });
    res.set('Cache-Control', 'no-store');
    res.json(publicDiagnostic);
  } catch (error) {
    console.error('Error al consultar ticket:', error.message);
    res.status(500).json({ message: 'No se pudo consultar el ticket' });
  }
}

// Busca un ticket administrativo por referencia y conserva su identificador interno.
async function getDiagnosticByTicket(req, res) {
  try {
    const ticket = await Diagnostic.findOne({ ticketNumber: String(req.params.ticketNumber).toUpperCase() }).select('_id ticketNumber status').lean();
    return ticket ? res.json(ticket) : res.status(404).json({ message: 'No se encontró el ticket' });
  } catch (error) {
    console.error('Error al buscar ticket para facturación:', error.message);
    return res.status(500).json({ message: 'No se pudo buscar el ticket' });
  }
}

// Reutiliza la vista pública de seguimiento sin incluir datos ni identificadores del cliente.
async function getPublicTicketData(ticketNumber) {
  const diagnostic = await Diagnostic.findOne({ ticketNumber: String(ticketNumber).toUpperCase() })
    .select('ticketNumber brand model issue status statusHistory').lean();
  if (!diagnostic) return null;
  const invoices = (await Invoice.find({ diagnosticId: diagnostic._id, status: { $ne: 'anulada' } })
    .sort({ createdAt: -1, _id: -1 }).lean()).map(invoice => serializeInvoice(invoice, { publicView: true }));
  const { _id, ...publicDiagnostic } = diagnostic;
  return { ...publicDiagnostic, invoices, invoice: invoices[0] || null };
}

// Exporta la consulta pública para reutilizarla desde el chatbot.
module.exports = { createDiagnostic, getAllDiagnostics, getReceivedReports, updateDiagnosticStatus, trackByTicket, getDiagnosticByTicket, getPublicTicketData };
