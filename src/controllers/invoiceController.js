const Invoice = require('../models/Invoice');
const Diagnostic = require('../models/Diagnostic');

// Crea una factura ligada a un diagnóstico (solo admin)
async function createInvoice(req, res) {
  try {
    const { diagnosticId, items } = req.body;

    if (!diagnosticId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Faltan datos: diagnosticId e items son obligatorios' });
    }

    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (!diagnostic) {
      return res.status(404).json({ message: 'El diagnóstico no existe' });
    }

    const total = items.reduce((sum, item) => sum + item.price, 0);

    const invoice = await Invoice.create({
      diagnosticId,
      items,
      total
    });

    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la factura', error: error.message });
  }
}

// Obtiene la factura de un diagnóstico específico (usado tanto por admin como por el cliente)
async function getInvoiceByDiagnostic(req, res) {
  try {
    const { diagnosticId } = req.params;

    const invoice = await Invoice.findOne({ diagnosticId });
    if (!invoice) {
      return res.status(404).json({ message: 'No hay factura para este diagnóstico' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la factura', error: error.message });
  }
}

// Marca una factura como pagada (solo admin)
async function markInvoiceAsPaid(req, res) {
  try {
    const { id } = req.params;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: 'Factura no encontrada' });
    }

    invoice.status = 'pagada';
    await invoice.save();

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la factura', error: error.message });
  }
}

module.exports = { createInvoice, getInvoiceByDiagnostic, markInvoiceAsPaid };