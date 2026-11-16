// Gestiona eliminaciones definitivas y registros de auditoría administrativos.
const mongoose = require('mongoose');
const Diagnostic = require('../models/Diagnostic');
const Invoice = require('../models/Invoice');
const AuditLog = require('../models/AuditLog');

// Construye eventos de auditoría que no incluyen nombres, contactos ni descripciones.
function auditRows(req, entityType, records) {
  return records.map(record => ({
    actorId: req.admin.id, action: 'delete', entityType, entityId: record._id,
    reference: entityType === 'invoice' ? record.invoiceNumber : record.ticketNumber,
    ipAddress: String(req.ip || req.socket.remoteAddress || 'unknown').slice(0, 64), occurredAt: new Date()
  }));
}

// Elimina una factura y deja un evento de auditoría dentro de la misma transacción.
async function deleteInvoice(req, res) {
  const session = await mongoose.startSession();
  try {
    let removed;
    await session.withTransaction(async () => {
      const invoice = await Invoice.findById(req.params.id).session(session);
      if (!invoice) return;
      removed = invoice.toObject();
      await Invoice.deleteOne({ _id: invoice._id }, { session });
      await AuditLog.create(auditRows(req, 'invoice', [removed]), { session });
    });
    if (!removed) return res.status(404).json({ message: 'Factura no encontrada' });
    return res.json({ message: 'Factura eliminada', invoiceNumber: removed.invoiceNumber });
  } catch (error) {
    console.error('Error al eliminar factura:', error.message);
    return res.status(500).json({ message: 'No se pudo eliminar la factura' });
  } finally {
    await session.endSession();
  }
}

// Elimina varias facturas por IDs explícitos y registra cada eliminación.
async function bulkDeleteInvoices(req, res) {
  const ids = [...new Set(req.body.ids)];
  if (!ids.length) return res.status(400).json({ message: 'Selecciona al menos una factura' });
  const session = await mongoose.startSession();
  try {
    let deleted = [];
    await session.withTransaction(async () => {
      deleted = await Invoice.find({ _id: { $in: ids } }).session(session).lean();
      if (deleted.length) {
        await Invoice.deleteMany({ _id: { $in: deleted.map(invoice => invoice._id) } }, { session });
        await AuditLog.create(auditRows(req, 'invoice', deleted), { session });
      }
    });
    const found = new Set(deleted.map(invoice => String(invoice._id)));
    return res.json({ deletedCount: deleted.length, notFoundIds: ids.filter(id => !found.has(String(id))) });
  } catch (error) {
    console.error('Error al eliminar facturas:', error.message);
    return res.status(500).json({ message: 'No se pudieron eliminar las facturas' });
  } finally {
    await session.endSession();
  }
}

// Devuelve las referencias de facturas necesarias para una decisión explícita.
async function linkedInvoices(diagnosticIds, session = null) {
  let query = Invoice.find({ diagnosticId: { $in: diagnosticIds } })
    .select('_id invoiceNumber ticketNumber diagnosticId').sort({ invoiceNumber: 1 });
  if (session) query = query.session(session);
  return query.lean();
}

// Elimina un diagnóstico solo si no tiene facturas o se confirma borrarlas también.
async function deleteDiagnostic(req, res) {
  const session = await mongoose.startSession();
  try {
    const withInvoices = req.query.withInvoices === 'true';
    let diagnostic;
    let invoices = [];
    let removed = false;
    await session.withTransaction(async () => {
      diagnostic = await Diagnostic.findById(req.params.id).session(session);
      if (!diagnostic) return;
      invoices = await linkedInvoices([diagnostic._id], session);
      if (invoices.length && !withInvoices) return;
      if (invoices.length) await Invoice.deleteMany({ _id: { $in: invoices.map(invoice => invoice._id) } }, { session });
      await Diagnostic.deleteOne({ _id: diagnostic._id }, { session });
      await AuditLog.create([
        ...auditRows(req, 'diagnostic', [diagnostic]), ...auditRows(req, 'invoice', invoices)
      ], { session });
      removed = true;
    });
    if (!diagnostic) return res.status(404).json({ message: 'Diagnóstico no encontrado' });
    if (!removed && invoices.length) {
      return res.status(409).json({ message: 'El diagnóstico tiene facturas asociadas', invoices });
    }
    return res.json({ message: 'Diagnóstico eliminado', ticketNumber: diagnostic.ticketNumber, deletedInvoices: invoices.length });
  } catch (error) {
    console.error('Error al eliminar diagnóstico:', error.message);
    return res.status(500).json({ message: 'No se pudo eliminar el diagnóstico' });
  } finally {
    await session.endSession();
  }
}

// Elimina diagnósticos seleccionados y bloquea el lote si hay facturas no confirmadas.
async function bulkDeleteDiagnostics(req, res) {
  const ids = [...new Set(req.body.ids)];
  if (!ids.length) return res.status(400).json({ message: 'Selecciona al menos un diagnóstico' });
  const withInvoices = req.body.withInvoices === true;
  const session = await mongoose.startSession();
  try {
    let diagnostics = [];
    let invoices = [];
    let removed = false;
    await session.withTransaction(async () => {
      diagnostics = await Diagnostic.find({ _id: { $in: ids } }).session(session).lean();
      if (!diagnostics.length) return;
      const diagnosticIds = diagnostics.map(diagnostic => diagnostic._id);
      invoices = await linkedInvoices(diagnosticIds, session);
      if (invoices.length && !withInvoices) return;
      if (invoices.length) await Invoice.deleteMany({ _id: { $in: invoices.map(invoice => invoice._id) } }, { session });
      await Diagnostic.deleteMany({ _id: { $in: diagnosticIds } }, { session });
      await AuditLog.create([
        ...auditRows(req, 'diagnostic', diagnostics), ...auditRows(req, 'invoice', invoices)
      ], { session });
      removed = true;
    });
    if (!diagnostics.length) return res.json({ deletedCount: 0, notFoundIds: ids });
    if (!removed && invoices.length) {
      return res.status(409).json({ message: 'Algunos diagnósticos tienen facturas asociadas', invoices });
    }
    const found = new Set(diagnostics.map(diagnostic => String(diagnostic._id)));
    return res.json({ deletedCount: diagnostics.length, deletedInvoices: invoices.length, notFoundIds: ids.filter(id => !found.has(String(id))) });
  } catch (error) {
    console.error('Error al eliminar diagnósticos:', error.message);
    return res.status(500).json({ message: 'No se pudieron eliminar los diagnósticos' });
  } finally {
    await session.endSession();
  }
}

// Exporta operaciones para sus rutas y el panel administrativo.
module.exports = { deleteInvoice, bulkDeleteInvoices, deleteDiagnostic, bulkDeleteDiagnostics };
