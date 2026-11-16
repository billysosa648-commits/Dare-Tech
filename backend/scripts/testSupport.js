// Prepara una base Mongo temporal, un servidor HTTP y un administrador de prueba.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
let identifierSequence = 1;

// Configura límites y entorno de desarrollo antes de cargar las rutas Express.
function configureTestEnvironment() {
  if (!process.env.MONGO_URI) throw new Error('Configura MONGO_URI en backend/.env');
  if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32) throw new Error('JWT_SECRET debe tener al menos 32 bytes');
  process.env.NODE_ENV = 'development';
  process.env.TURNSTILE_SECRET = '';
  process.env.TURNSTILE_SITE_KEY = '';
  process.env.TRUST_PROXY_HOPS = '1';
  process.env.DIAGNOSTIC_MIN_FILL_MS ||= '3000';
  process.env.DIAGNOSTIC_RATE_LIMIT_HOURLY ||= '5';
  process.env.DIAGNOSTIC_RATE_LIMIT_DAILY ||= '20';
}

// Ejecuta un flujo contra la base aislada y la borra al terminar.
async function withTestApp(run) {
  configureTestEnvironment();
  const dbName = `dare_tech_phase1_${Date.now()}_${process.pid}`;
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName, serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
    const ensureInvoiceStore = require('../src/config/invoiceStore');
    const ensureTicketCounter = require('../src/config/ticketStore');
    const ensureAuditStore = require('../src/config/auditStore');
    const ensureSpamFingerprintStore = require('../src/config/spamFingerprintStore');
    await ensureInvoiceStore();
    await ensureTicketCounter();
    await ensureAuditStore();
    await ensureSpamFingerprintStore();
    const Admin = require('../src/models/Admin');
    const admin = await Admin.create({ username: `phase1-${process.pid}`, passwordHash: await bcrypt.hash('Test-password-2026-only', 4), role: 'admin' });
    const token = jwt.sign({ id: admin._id.toString(), role: 'admin', tokenVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '5m', issuer: 'dare-tech-api', audience: 'dare-tech-admin' });
    const app = require('../src/app');
    server = await new Promise((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const auth = { Authorization: `Bearer ${token}` };
    await run({ base: `http://127.0.0.1:${server.address().port}/api`, auth, jsonHeaders: { ...auth, 'Content-Type': 'application/json' } });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}

// Crea un diagnóstico con campos de ejemplo para pruebas de borrado y seguimiento.
async function createTestDiagnostic(overrides = {}) {
  const Diagnostic = require('../src/models/Diagnostic');
  const suffix = String((Date.now() + identifierSequence++) % 10000000000).padStart(10, '0');
  return Diagnostic.create({
    ticketNumber: `DT-${suffix}`, brand: 'Marca de prueba', model: 'Modelo temporal', issue: 'Descripción privada de prueba',
    customerName: 'Cliente de prueba', customerContact: '0999999999', ...overrides
  });
}

// Crea una factura asociada con importes válidos en centavos.
async function createTestInvoice(diagnostic) {
  const Invoice = require('../src/models/Invoice');
  const invoiceSequence = identifierSequence++ % 1000000;
  return Invoice.create({
    invoiceNumber: `DT-${String(invoiceSequence).padStart(6, '0')}`,
    diagnosticId: diagnostic._id, ticketNumber: diagnostic.ticketNumber,
    customer: { name: diagnostic.customerName, contact: diagnostic.customerContact }, issuedAt: new Date(),
    status: 'pendiente', items: [{ description: 'Prueba temporal', quantity: 1, unitPriceCents: 100, subtotalCents: 100 }],
    subtotalCents: 100, ivaRateBps: 1500, ivaCents: 15, discountCents: 0, totalCents: 115
  });
}

// Comprueba el estado HTTP y muestra el flujo que falló.
async function assertStatus(response, expected, label) {
  if (response.status !== expected) throw new Error(`${label}: HTTP ${response.status}, esperado ${expected}; ${(await response.text()).slice(0, 300)}`);
}

// Exporta utilidades compartidas por los scripts de fase 1.
module.exports = { withTestApp, createTestDiagnostic, createTestInvoice, assertStatus };
