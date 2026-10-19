const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  diagnosticId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Diagnostic',
    required: true
  },
  items: [
    {
      description: { type: String, required: true },
      price: { type: Number, required: true }
    }
  ],
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pendiente', 'pagada'],
    default: 'pendiente'
  }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);