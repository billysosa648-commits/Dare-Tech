// Responde preguntas frecuentes desde MongoDB y el seguimiento público existente.
const Faq = require('../models/Faq');
const Service = require('../models/Service');
const { matchFaq, normalizeWords } = require('../services/faqMatcher');
const { askGemini } = require('../services/geminiService');
const { getPublicTicketData } = require('./diagnosticController');
const defaultFaqs = require('../data/defaultFaqs');

// Define preguntas sugeridas que el sitio puede responder con datos confirmados.
const DEFAULT_SUGGESTIONS = ['¿Qué servicios ofrecen?', '¿Dónde están ubicados?', '¿Cómo consulto mi ticket?'];

// Responde de forma breve cuando la persona describe una falla de su equipo.
function answerDeviceIssue(message) {
  const words = new Set(normalizeWords(message));
  const mentionsDevice = ['telefono', 'celular', 'movil', 'computadora', 'laptop', 'tablet', 'equipo', 'audifono', 'audifonos', 'auricular', 'auriculares'].some(word => words.has(word));
  const mentionsAudio = ['audifono', 'audifonos', 'auricular', 'auriculares', 'jack', 'audio'].some(word => words.has(word));
  const mentionsSlow = ['lento', 'lenta', 'lentos', 'lentas', 'lentitud', 'traba', 'trabado', 'congela', 'congelado'].some(word => words.has(word));
  const describesFailure = ['problema', 'falla', 'reparar', 'reparacion', 'roto', 'danado', 'funciona', 'reconoce', 'detecta', 'carga', 'prende'].some(word => words.has(word));

  if (mentionsAudio) return 'Podemos ayudarte con ese problema. Envía un reporte en el formulario de diagnóstico de la página principal para que podamos atenderte.';
  if (mentionsDevice && mentionsSlow) return 'Podemos ayudarte con tu teléfono lento. Envía un reporte en el formulario de diagnóstico de la página principal para que podamos atenderte.';
  if (mentionsDevice && describesFailure) return 'Podemos ayudarte con esa falla. Envía un reporte en el formulario de diagnóstico de la página principal para que podamos atenderte.';
  return null;
}

// Oculta teléfonos, correos y canales de contacto salvo que la persona los pida.
function hideUnrequestedContact(answer, message) {
  const normalizedMessage = normalizeWords(message).join(' ');
  const explicitlyRequested = /\b(whatsapp|correo|email|e mail|contacto|contactar|llamar)\b/i.test(normalizedMessage)
    || /\b(?:dame|pasame|me das|cual es|necesito|quiero)\b.{0,30}\b(?:numero|telefono)\b/i.test(normalizedMessage);
  if (explicitlyRequested) return answer;
  const contactPattern = /whatsapp|e-?mail|\bcorreo\b|\b(?:llamar|escribir)\b.{0,30}\b(?:tel[eé]fono|n[uú]mero|whatsapp)\b|\+?\d[\d\s().-]{6,}\d/i;
  const safeAnswer = answer.split(/(?<=[.!?])\s+/).filter(sentence => !contactPattern.test(sentence)).join(' ').trim();
  return safeAnswer || 'Envía un reporte en el formulario de diagnóstico de la página principal para que podamos orientarte.';
}

// Devuelve respuestas textuales sin usar HTML ni servicios externos.
async function answerQuestion(req, res) {
  try {
    const message = req.body.message.trim();
    const ticketNumber = message.match(/\bDT-\d{5,10}\b/i)?.[0];
    if (ticketNumber) {
      const ticket = await getPublicTicketData(ticketNumber);
      if (!ticket) return res.json({ answer: `No encontré el ticket ${ticketNumber.toUpperCase()}. Revisa que esté escrito correctamente.`, suggestions: DEFAULT_SUGGESTIONS });
      const device = [ticket.brand, ticket.model].filter(Boolean).join(' ');
      return res.json({ answer: `El ticket ${ticket.ticketNumber} (${device}) está en estado: ${ticket.status.replaceAll('_', ' ')}.`, suggestions: DEFAULT_SUGGESTIONS });
    }

    const storedFaqs = await Faq.find().sort({ order: 1, _id: 1 }).lean();
    const storedQuestions = new Set(storedFaqs.map(faq => normalizeWords(faq.question).join(' ')));
    const faqs = [
      ...storedFaqs.filter(faq => faq.active),
      ...defaultFaqs.filter(faq => faq.active && !storedQuestions.has(normalizeWords(faq.question).join(' ')))
    ].sort((first, second) => first.order - second.order);
    const issueAnswer = answerDeviceIssue(message);
    if (issueAnswer) return res.json({ answer: issueAnswer, suggestions: DEFAULT_SUGGESTIONS });
    const match = matchFaq(message, faqs);
    const useGemini = Boolean(process.env.GEMINI_API_KEY?.trim()) && process.env.CHATBOT_AI_MODE === 'always';
    if (match && !useGemini) {
      return res.json({ answer: hideUnrequestedContact(match.answer, message), suggestions: faqs.slice(0, 3).map(faq => faq.question) });
    }
    if (!match && process.env.GEMINI_API_KEY?.trim()) {
      const services = await Service.find({ active: true }).sort({ order: 1, _id: 1 }).lean();
      const answer = await askGemini({ message, faqs, services });
      if (answer) return res.json({ answer: hideUnrequestedContact(answer, message), suggestions: faqs.slice(0, 3).map(faq => faq.question), ai: true });
    } else if (useGemini) {
      const services = await Service.find({ active: true }).sort({ order: 1, _id: 1 }).lean();
      const answer = await askGemini({ message, faqs, services });
      if (answer) return res.json({ answer: hideUnrequestedContact(answer, message), suggestions: faqs.slice(0, 3).map(faq => faq.question), ai: true });
    }
    return res.json({
      answer: 'No encontré una respuesta con la información disponible. Envía un reporte en el formulario de diagnóstico de la página principal para que podamos orientarte.',
      suggestions: DEFAULT_SUGGESTIONS
    });
  } catch (error) {
    console.error('Error al responder en el chatbot:', error.message);
    return res.status(500).json({ message: 'No se pudo consultar el chatbot' });
  }
}

// Exporta el endpoint público de preguntas frecuentes.
module.exports = { answerQuestion, answerDeviceIssue, hideUnrequestedContact };
