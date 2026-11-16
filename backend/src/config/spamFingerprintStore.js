// Prepara el almacenamiento temporal de huellas antes de aceptar formularios.
const SpamFingerprint = require('../models/SpamFingerprint');

// Crea la colección y su índice TTL para limpiar huellas vencidas.
async function ensureSpamFingerprintStore() {
  const db = SpamFingerprint.db.db;
  const exists = await db.listCollections({ name: SpamFingerprint.collection.name }).hasNext();
  if (!exists) await SpamFingerprint.createCollection();
  await SpamFingerprint.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}

// Exporta la preparación del almacén temporal.
module.exports = ensureSpamFingerprintStore;
