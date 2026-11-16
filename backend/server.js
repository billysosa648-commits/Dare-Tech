// Carga configuración local sin mostrar valores sensibles.
require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const ensureInvoiceStore = require('./src/config/invoiceStore');
const ensureTicketCounter = require('./src/config/ticketStore');
const ensureAuditStore = require('./src/config/auditStore');
const ensureSpamFingerprintStore = require('./src/config/spamFingerprintStore');

const PORT = process.env.PORT || 4000;

// Rechaza configuraciones incompletas antes de iniciar el servidor.
if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32) {
  throw new Error('JWT_SECRET debe estar configurado con al menos 32 bytes aleatorios');
}
if (!process.env.MONGO_URI) throw new Error('MONGO_URI debe estar configurado');
// Evita iniciar producción con Turnstile desactivado o incompleto.
if (process.env.NODE_ENV !== 'development' && (!process.env.TURNSTILE_SECRET || !process.env.TURNSTILE_SITE_KEY)) {
  throw new Error('TURNSTILE_SECRET y TURNSTILE_SITE_KEY son obligatorios en producción');
}

// Prepara colecciones e índices antes de abrir el puerto HTTP.
connectDB().then(ensureInvoiceStore).then(ensureTicketCounter).then(ensureAuditStore).then(ensureSpamFingerprintStore).then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
  });
});
