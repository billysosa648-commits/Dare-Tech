const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true, maxlength: 200 },
  quantity: { type: Number, required: true, min: 1, max: 1000 },
  unitPriceCents: { type: Number, required: true, min: 0, max: 100000000 },
  subtotalCents: { type: Number, required: true, min: 0, max: 3000000000 }
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true, immutable: true },
  diagnosticId: { type: mongoose.Schema.Types.ObjectId, ref: 'Diagnostic', required: true, index: true },
  ticketNumber: { type: String, required: true, trim: true, maxlength: 32 },
  customer: {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    contact: { type: String, required: true, trim: true, maxlength: 120 }
  },
  issuedAt: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['pendiente', 'pagada', 'anulada'], default: 'pendiente', index: true },
  paymentMethod: { type: String, enum: ['efectivo', 'tarjeta', 'transferencia', 'otro', null], default: null },
  items: { type: [invoiceItemSchema], required: true, validate: value => value.length >= 1 && value.length <= 30 },
  subtotalCents: { type: Number, required: true, min: 0, max: 3000000000 },
  ivaRateBps: { type: Number, required: true, min: 0, max: 1500, default: 1500 },
  ivaCents: { type: Number, required: true, min: 0, max: 3000000000 },
  discountCents: { type: Number, required: true, min: 0, max: 3000000000, default: 0 },
  totalCents: { type: Number, required: true, min: 0, max: 3000000000 },
  notes: { type: String, trim: true, maxlength: 1000, default: '' },
  idempotencyKey: { type: String, maxlength: 80, default: undefined },
  annulledAt: { type: Date, default: null },
  annulledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null }
}, { timestamps: true, autoIndex: false, autoCreate: false });

invoiceSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
invoiceSchema.index({ createdAt: -1, _id: -1 });
invoiceSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
