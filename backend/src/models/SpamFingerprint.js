// Guarda huellas de problemas recientes para bloquear duplicados concurrentes por 24 horas.
const mongoose = require('mongoose');

// Mantiene solo la huella y su vencimiento, sin nombres ni contactos legibles.
const spamFingerprintSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, { collection: 'spamfingerprints', versionKey: false });

// Borra huellas vencidas cuando MongoDB ejecuta su tarea de TTL.
spamFingerprintSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Registra el modelo con nombre separado del documento de diagnóstico.
module.exports = mongoose.model('SpamFingerprint', spamFingerprintSchema);
