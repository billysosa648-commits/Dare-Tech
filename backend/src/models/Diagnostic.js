const mongoose = require('mongoose');

const diagnosticSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true,
    unique: true
  },
  brand: { type: String, required: true },
  model: { type: String },
  issue: { type: String, required: true },
  customerName: { type: String, required: true },
  customerContact: { type: String, required: true },
  // Huellas no reversibles para deduplicar reportes sin guardar el contacto en texto dentro de los índices.
  contactHash: { type: String, select: false },
  // Huella del mismo problema para evitar tickets repetidos durante la ventana configurada.
  spamHash: { type: String, select: false },
  origin: { type: String, enum: ['report', 'invoice'], default: 'report', index: true },
  status: {
    type: String,
    enum: ['recibido', 'en_revision', 'reparado', 'entregado'],
    default: 'recibido'
  },
  statusHistory: [
    {
      status: String,
      date: { type: Date, default: Date.now },
      note: String
    }
  ]
}, { timestamps: true });

// Acelera los conteos diarios por contacto y la búsqueda de duplicados recientes.
diagnosticSchema.index({ contactHash: 1, createdAt: -1 });
diagnosticSchema.index({ spamHash: 1, createdAt: -1 });

module.exports = mongoose.model('Diagnostic', diagnosticSchema);
