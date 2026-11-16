// Prepara la colección e índices de auditoría antes de aceptar solicitudes administrativas.
const AuditLog = require('../models/AuditLog');

// Asegura la colección y los índices que se usan dentro de las transacciones de borrado.
async function ensureAuditStore() {
  const db = AuditLog.db.db;
  const exists = await db.listCollections({ name: AuditLog.collection.name }).hasNext();
  if (!exists) await AuditLog.createCollection();
  await AuditLog.collection.createIndex({ occurredAt: -1 });
  await AuditLog.collection.createIndex({ entityType: 1, entityId: 1 });
}

// Exporta la preparación del almacén de auditoría.
module.exports = ensureAuditStore;
