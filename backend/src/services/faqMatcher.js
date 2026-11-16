// Busca respuestas en las FAQs activas sin usar servicios externos.
const STOP_WORDS = new Set('a al algo como con cual cuales cuando cuanto de del desde donde durante e el ella ellas ellos en entre era es esa esas ese eso esos esta estas este esto estos fue ha hasta hay la las le les lo los mas me mi mis mucho muy ni no o para pero por que se sin sobre su sus te tu tus un una unas uno unos y ya'.split(' '));

// Normaliza tildes, mayúsculas y signos para comparar palabras equivalentes.
function normalizeWords(value) {
  return String(value || '').toLocaleLowerCase('es-EC').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

// Puntúa palabras exactas de la pregunta y sus palabras clave.
function scoreFaq(messageWords, faq) {
  const questionWords = new Set(normalizeWords(faq.question));
  const keywords = new Set((faq.keywords || []).flatMap(normalizeWords));
  let score = 0;
  for (const word of messageWords) {
    if (keywords.has(word)) score += 3;
    if (questionWords.has(word)) score += 1;
  }
  return score;
}

// Devuelve la coincidencia más fuerte solo si supera el umbral mínimo.
function matchFaq(message, faqs, threshold = 3) {
  const words = normalizeWords(message);
  if (!words.length) return null;
  const ranked = faqs.map(faq => ({ faq, score: scoreFaq(words, faq) }))
    .sort((a, b) => b.score - a.score || a.faq.order - b.faq.order);
  return ranked[0]?.score >= threshold ? ranked[0].faq : null;
}

// Exporta las funciones para el controlador y las pruebas aisladas.
module.exports = { normalizeWords, scoreFaq, matchFaq };
