// Aplica controles de envío y verificación Turnstile antes de crear un diagnóstico.
const crypto = require('crypto');
const Diagnostic = require('../models/Diagnostic');
const SpamFingerprint = require('../models/SpamFingerprint');

// Devuelve una representación estable para calcular huellas del formulario.
function normalize(value) {
  return String(value || '').toLocaleLowerCase('es-EC').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

// Construye huellas SHA-256 sin incluir el texto personal en consultas indexadas.
function makeHashes({ customerContact, brand, model, issue }) {
  const contact = normalize(customerContact).replace(/\s/g, '');
  const hash = value => crypto.createHmac('sha256', process.env.JWT_SECRET || 'dare-tech-development-only').update(value).digest('hex');
  return {
    contactHash: hash(contact),
    spamHash: hash([contact, brand, model, issue].map(normalize).join('|'))
  };
}

// Valida el campo trampa y el tiempo de llenado con respuestas genéricas.
function validateFormTiming(req, res, next) {
  const startedAt = Number(req.body.formStartedAt);
  const minimum = Math.max(0, Number(process.env.DIAGNOSTIC_MIN_FILL_MS || 3000));
  const elapsed = Date.now() - startedAt;
  if (req.body.website !== '' || !Number.isFinite(startedAt) || elapsed < minimum || elapsed > 2 * 60 * 60 * 1000) {
    return res.status(400).json({ message: 'No se pudo procesar el reporte. Revisa los datos e inténtalo nuevamente.' });
  }
  return next();
}

// Confirma el token contra Cloudflare y falla cerrado en producción.
async function verifyTurnstile(req, res, next) {
  const secret = process.env.TURNSTILE_SECRET;
  const token = req.body.turnstileToken;
  if (!secret) {
    if (process.env.NODE_ENV === 'development') return next();
    return res.status(503).json({ message: 'No se pudo procesar el reporte. Inténtalo más tarde.' });
  }
  if (typeof token !== 'string' || token.length > 2048) {
    return res.status(400).json({ message: 'No se pudo procesar el reporte. Revisa los datos e inténtalo nuevamente.' });
  }
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, ...(req.ip ? { remoteip: req.ip } : {}) }),
      signal: AbortSignal.timeout(5000)
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      return res.status(400).json({ message: 'No se pudo procesar el reporte. Revisa los datos e inténtalo nuevamente.' });
    }
    return next();
  } catch {
    return res.status(503).json({ message: 'No se pudo procesar el reporte. Inténtalo más tarde.' });
  }
}

// Impide duplicados por 24 horas y limita el volumen diario por contacto.
async function enforceContactLimits(req, res, next) {
  try {
    const hashes = makeHashes(req.body);
    const now = new Date();
    // Cuenta el tope diario usando el día local del negocio en Guayaquil.
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(now).map(part => [part.type, part.value]));
    const dayStart = new Date(`${parts.year}-${parts.month}-${parts.day}T05:00:00.000Z`);
    const duplicateSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const dailyLimit = Math.max(1, Number(process.env.DIAGNOSTIC_CONTACT_DAILY_LIMIT || 3));
    const [duplicate, dailyCount] = await Promise.all([
      Diagnostic.exists({ spamHash: hashes.spamHash, createdAt: { $gte: duplicateSince } }),
      Diagnostic.countDocuments({ contactHash: hashes.contactHash, createdAt: { $gte: dayStart } })
    ]);
    if (duplicate || dailyCount >= dailyLimit) {
      return res.status(429).json({ message: 'No se pudo procesar el reporte. Revisa los datos e inténtalo nuevamente.' });
    }
    // Reserva la huella de forma atómica para que dos solicitudes simultáneas no creen tickets repetidos.
    try {
      await SpamFingerprint.findOneAndUpdate(
        { _id: hashes.spamHash, expiresAt: { $lte: now } },
        { $set: { expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (error) {
      if (error.code === 11000) return res.status(429).json({ message: 'No se pudo procesar el reporte. Revisa los datos e inténtalo nuevamente.' });
      throw error;
    }
    req.diagnosticHashes = hashes;
    return next();
  } catch (error) {
    return next(error);
  }
}

// Expone los controles para componerlos en la ruta de creación.
module.exports = { validateFormTiming, verifyTurnstile, enforceContactLimits };
