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

module.exports = mongoose.model('Diagnostic', diagnosticSchema);