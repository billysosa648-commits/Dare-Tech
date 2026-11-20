// Define los servicios visibles en la web y editables desde el panel.
const mongoose = require('mongoose');

// Conserva los campos descriptivos sin inventar precios ni tiempos.
const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  icon: { type: String, trim: true, maxlength: 16, default: '' },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  category: { type: String, required: true, trim: true, maxlength: 60 },
  estimatedTime: { type: String, trim: true, maxlength: 100, default: '' },
  active: { type: Boolean, default: true },
  order: { type: Number, default: 0, min: 0, max: 10000 }
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
