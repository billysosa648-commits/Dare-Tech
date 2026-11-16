// Define registros de acciones administrativas sin datos personales del cliente.
const mongoose = require('mongoose');

// Describe los campos mínimos para rastrear una eliminación.
const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  action: { type: String, enum: ['delete'], required: true },
  entityType: { type: String, enum: ['invoice', 'diagnostic'], required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  reference: { type: String, required: true, maxlength: 32 },
  ipAddress: { type: String, required: true, maxlength: 64 },
  occurredAt: { type: Date, required: true, default: Date.now }
}, { versionKey: false });

// Indexa la consulta cronológica de auditoría por administrador y objeto.
auditLogSchema.index({ occurredAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

// Registra la colección auditlogs.
module.exports = mongoose.model('AuditLog', auditLogSchema);
