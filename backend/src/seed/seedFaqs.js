// Inserta FAQs iniciales basadas únicamente en afirmaciones publicadas en index.html.
require('dotenv').config();
const mongoose = require('mongoose');
const Faq = require('../models/Faq');

// Conserva preguntas verificables y remite al contacto cuando el sitio no publica el dato.
const initialFaqs = [
  { question: '¿Qué servicios ofrecen?', answer: 'Dare-Tech ofrece diagnóstico y reparación de software y hardware: revisión del sistema operativo, limpieza de malware, optimización, atención de bloqueos, reemplazo de pantallas, cambio de baterías y reparación de puertos de carga y jacks de audio.', keywords: ['servicios', 'reparar', 'pantalla', 'bateria', 'software', 'hardware', 'puerto', 'malware'], category: 'servicios', active: true, order: 1 },
  { question: '¿Dónde están ubicados?', answer: 'El sitio indica que Dare-Tech está en Guayaquil, Ecuador. Para coordinar la atención, escríbenos por WhatsApp al +593 92 286 89 o al correo billysosa648@gmail.com.', keywords: ['ubicacion', 'direccion', 'guayaquil', 'visitar'], category: 'contacto', active: true, order: 2 },
  { question: '¿Cómo puedo contactarlos?', answer: 'Puedes escribir al correo billysosa648@gmail.com o llamar o escribir por WhatsApp al +593 92 286 89.', keywords: ['contacto', 'whatsapp', 'telefono', 'correo', 'email'], category: 'contacto', active: true, order: 3 },
  { question: '¿Cómo consulto el estado de mi ticket?', answer: 'Abre la sección Seguimiento del sitio e ingresa tu número de ticket, que tiene el formato DT- seguido de números. También puedes escribir el número aquí.', keywords: ['seguimiento', 'ticket', 'estado', 'orden', 'reparacion'], category: 'seguimiento', active: true, order: 4 },
  { question: '¿Cuánto cuesta una reparación?', answer: 'El sitio no publica una lista de precios. Describe el problema en el formulario de diagnóstico para recibir orientación o consulta por WhatsApp al +593 92 286 89.', keywords: ['precio', 'precios', 'costo', 'cuesta', 'valor', 'cotizacion'], category: 'precios', active: true, order: 5 },
  { question: '¿Cuánto tiempo demora una reparación?', answer: 'El sitio no publica tiempos estimados por reparación. Para consultar tu caso, escribe por WhatsApp al +593 92 286 89.', keywords: ['tiempo', 'demora', 'dias', 'horas', 'pantalla', 'estimado'], category: 'tiempos', active: true, order: 6 },
  { question: '¿Qué garantía tienen las reparaciones?', answer: 'El sitio menciona baterías con ciclos de vida garantizados, pero no publica condiciones generales ni plazos de garantía. Consulta las condiciones de tu reparación por WhatsApp al +593 92 286 89.', keywords: ['garantia', 'garantizado', 'garantizados', 'condiciones'], category: 'garantia', active: true, order: 7 },
  { question: '¿Cuál es el horario de atención?', answer: 'El sitio no publica un horario de atención. Confírmalo por WhatsApp al +593 92 286 89 o por correo en billysosa648@gmail.com.', keywords: ['horario', 'abierto', 'atencion', 'cuando'], category: 'contacto', active: true, order: 8 }
];

// Agrega cada pregunta solo si aún no existe para evitar duplicar el seed.
async function seedFaqs() {
  await mongoose.connect(process.env.MONGO_URI);
  for (const faq of initialFaqs) await Faq.updateOne({ question: faq.question }, { $setOnInsert: faq }, { upsert: true });
}

// Ejecuta el seed y cierra MongoDB aun cuando ocurra un error.
seedFaqs().then(() => console.log('FAQs iniciales insertadas o ya existentes.'))
  .catch(error => { console.error('No se pudieron insertar las FAQs:', error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
