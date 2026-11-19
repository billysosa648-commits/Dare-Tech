// Comprueba Gemini con fetch simulado para evitar red, credenciales y consumo de cuota.
const assert = require('node:assert/strict');
const { askGemini } = require('../src/services/geminiService');

// Ejecuta escenarios aislados con respuestas simuladas.
async function main() {
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_DAILY_LIMIT = '7';
  process.env.GEMINI_MODEL = 'gemini-3.8-flash';
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async (url, options) => {
    calls += 1;
    assert.match(url, calls <= 4 || calls === 6 ? /gemini-3\.8-flash:generateContent$/ : /gemini-3\.5-flash-lite:generateContent$/);
    assert.equal(options.headers['x-goog-api-key'], 'test-key');
    const generationConfig = JSON.parse(options.body).generationConfig;
    assert.equal(generationConfig.maxOutputTokens, 400);
    assert.equal(generationConfig.thinkingConfig.thinkingLevel, 'LOW');
    assert.equal(generationConfig.temperature, undefined);
    if (calls === 1) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Dare-Tech ofrece reparación de celulares.' }] } }] }) };
    if (calls === 2) return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'NO_SE' }] } }] }) };
    if (calls === 3 || calls === 4) return { ok: false, status: 503 };
    if (calls === 6) return { ok: false, status: 404 };
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Respuesta tras reintento.' }] } }] }) };
  };
  try {
    assert.equal(await askGemini({ message: '¿Qué hacen?', faqs: [], services: [] }), 'Dare-Tech ofrece reparación de celulares.');
    assert.equal(await askGemini({ message: '¿Atienden motos?', faqs: [], services: [] }), null);
    assert.equal(await askGemini({ message: 'Otra pregunta', faqs: [], services: [] }), 'Respuesta tras reintento.');
    assert.equal(await askGemini({ message: 'Modelo no disponible', faqs: [], services: [] }), 'Respuesta tras reintento.');
    assert.equal(await askGemini({ message: 'Límite diario', faqs: [], services: [] }), null);
    assert.equal(calls, 7);
    console.log('OK Gemini simulado: respuesta válida, NO_SE, reintento alternativo por 503 y 404, y límite diario sin red ni cuota.');
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
