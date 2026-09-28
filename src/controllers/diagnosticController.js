const Diagnostic = require('../models/Diagnostic');

// Genera un número de ticket único, ej: DT-00001
async function generateTicketNumber() {
  const count = await Diagnostic.countDocuments();
  const nextNumber = count + 1;
  return `DT-${String(nextNumber).padStart(5, '0')}`;
}

// Crea un nuevo diagnóstico
async function createDiagnostic(req, res) {
  try {
    const { brand, model, issue, customerName, customerContact } = req.body;

    if (!brand || !issue || !customerName || !customerContact) {
      return res.status(400).json({ message: 'Faltan campos obligatorios' });
    }

    const ticketNumber = await generateTicketNumber();

    const diagnostic = await Diagnostic.create({
      ticketNumber,
      brand,
      model,
      issue,
      customerName,
      customerContact,
      statusHistory: [{ status: 'recibido', note: 'Diagnóstico recibido' }]
    });

    res.status(201).json(diagnostic);
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar el diagnóstico', error: error.message });
  }
}

// Obtiene TODOS los diagnósticos (solo para el admin)
async function getAllDiagnostics(req, res) {
  try {
    const diagnostics = await Diagnostic.find().sort({ createdAt: -1 });
    res.json(diagnostics);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los diagnósticos', error: error.message });
  }
}

// Cambia el estado de un diagnóstico (solo para el admin)
async function updateDiagnosticStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = ['recibido', 'en_revision', 'reparado', 'entregado'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Estado inválido' });
    }

    const diagnostic = await Diagnostic.findById(id);
    if (!diagnostic) {
      return res.status(404).json({ message: 'Diagnóstico no encontrado' });
    }

    diagnostic.status = status;
    diagnostic.statusHistory.push({ status, note: note || '' });
    await diagnostic.save();

    res.json(diagnostic);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el estado', error: error.message });
  }
}

const Invoice = require('../models/Invoice');

// Consulta pública: el cliente busca su diagnóstico por número de ticket
async function trackByTicket(req, res) {
  try {
    const { ticketNumber } = req.params;

    const diagnostic = await Diagnostic.findOne({ ticketNumber });
    if (!diagnostic) {
      return res.status(404).json({ message: 'No se encontró ningún ticket con ese número' });
    }

    const invoice = await Invoice.findOne({ diagnosticId: diagnostic._id });

    res.json({
      ticketNumber: diagnostic.ticketNumber,
      brand: diagnostic.brand,
      model: diagnostic.model,
      issue: diagnostic.issue,
      status: diagnostic.status,
      statusHistory: diagnostic.statusHistory,
      createdAt: diagnostic.createdAt,
      invoice: invoice || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al consultar el ticket', error: error.message });
  }
}

// Consulta pública: el cliente busca su diagnóstico por número de ticket
async function trackByTicket(req, res) {
  try {
    const { ticketNumber } = req.params;

    const diagnostic = await Diagnostic.findOne({ ticketNumber });
    if (!diagnostic) {
      return res.status(404).json({ message: 'No se encontró ningún ticket con ese número' });
    }

    const invoice = await Invoice.findOne({ diagnosticId: diagnostic._id });

    res.json({
      ticketNumber: diagnostic.ticketNumber,
      brand: diagnostic.brand,
      model: diagnostic.model,
      issue: diagnostic.issue,
      status: diagnostic.status,
      statusHistory: diagnostic.statusHistory,
      createdAt: diagnostic.createdAt,
      invoice: invoice || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al consultar el ticket', error: error.message });
  }
}

module.exports = { createDiagnostic, getAllDiagnostics, updateDiagnosticStatus, trackByTicket };
