// Responde preguntas frecuentes desde MongoDB y el seguimiento público existente.
const Faq = require('../models/Faq');
const { matchFaq } = require('../services/faqMatcher');
const { getPublicTicketData } = require('./diagnosticController');

// Define preguntas sugeridas que el sitio puede responder con datos confirmados.
const DEFAULT_SUGGESTIONS = ['¿Qué servicios ofrecen?', '¿Dónde están ubicados?', '¿Cómo consulto mi ticket?'];

// Devuelve respuestas textuales sin usar HTML ni servicios externos.
async function answerQuestion(req, res) {
  try {
    const message = req.body.message.trim();
    const ticketNumber = message.match(/\bDT-\d{5,10}\b/i)?.[0];
    if (ticketNumber) {
      const ticket = await getPublicTicketData(ticketNumber);
      if (!ticket) return res.json({ answer: `No encontré el ticket ${ticketNumber.toUpperCase()}. Revisa el número o contáctanos por WhatsApp al +593 92 286 89.`, suggestions: DEFAULT_SUGGESTIONS });
      const device = [ticket.brand, ticket.model].filter(Boolean).join(' ');
      return res.json({ answer: `El ticket ${ticket.ticketNumber} (${device}) está en estado: ${ticket.status.replaceAll('_', ' ')}.`, suggestions: DEFAULT_SUGGESTIONS });
    }

    const faqs = await Faq.find({ active: true }).sort({ order: 1, _id: 1 }).lean();
    const match = matchFaq(message, faqs);
    if (match) {
      return res.json({ answer: match.answer, suggestions: faqs.slice(0, 3).map(faq => faq.question) });
    }
    return res.json({
      answer: 'No encontré una respuesta con la información disponible. Escríbenos por WhatsApp al +593 92 286 89 o al correo billysosa648@gmail.com.',
      suggestions: DEFAULT_SUGGESTIONS
    });
  } catch (error) {
    console.error('Error al responder en el chatbot:', error.message);
    return res.status(500).json({ message: 'No se pudo consultar el chatbot' });
  }
}

// Exporta el endpoint público de preguntas frecuentes.
module.exports = { answerQuestion };
