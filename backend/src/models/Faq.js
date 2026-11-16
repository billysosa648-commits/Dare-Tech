// Define preguntas y respuestas editables que usa el chatbot local.
const mongoose = require('mongoose');

// Describe el contenido público y su orden de presentación.
const faqSchema = new mongoose.Schema({
  question: { type: String, required: true, trim: true, maxlength: 200 },
  answer: { type: String, required: true, trim: true, maxlength: 1500 },
  keywords: { type: [String], default: [], validate: list => list.length <= 20 },
  category: { type: String, required: true, trim: true, maxlength: 50 },
  active: { type: Boolean, default: true, index: true },
  order: { type: Number, default: 0, min: 0, max: 10000 }
}, { timestamps: true });

// Ordena FAQs activas con desempate estable por fecha e identificador.
faqSchema.index({ active: 1, order: 1, _id: 1 });

// Registra la colección faqs.
module.exports = mongoose.model('Faq', faqSchema);
