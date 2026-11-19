// Inserta FAQs iniciales basadas únicamente en afirmaciones publicadas en index.html.
require('dotenv').config();
const mongoose = require('mongoose');
const Faq = require('../models/Faq');
const initialFaqs = require('../data/defaultFaqs');

// Agrega cada pregunta solo si aún no existe para evitar duplicar el seed.
async function seedFaqs() {
  await mongoose.connect(process.env.MONGO_URI);
  for (const faq of initialFaqs) await Faq.updateOne({ question: faq.question }, { $setOnInsert: faq }, { upsert: true });
}

// Ejecuta el seed y cierra MongoDB aun cuando ocurra un error.
seedFaqs().then(() => console.log('FAQs iniciales insertadas o ya existentes.'))
  .catch(error => { console.error('No se pudieron insertar las FAQs:', error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
