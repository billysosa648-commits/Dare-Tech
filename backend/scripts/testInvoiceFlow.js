require('dotenv').config();

const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

function requireTestConfiguration() {
  if (!process.env.MONGO_URI) throw new Error('Configura MONGO_URI en backend/.env');
  if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 bytes');
  }
  const dbName = `dare_tech_test_${Date.now()}_${process.pid}`;
  return dbName;
}

function assertStatus(response, expected, label) {
  assert.equal(response.status, expected, `${label}: HTTP ${response.status}; esperado ${expected}`);
}

async function run() {
  const dbName = requireTestConfiguration();
  let server;
  let dbCreated = false;
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName, serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
    dbCreated = true;
    const ensureInvoiceStore = require('../src/config/invoiceStore');
    await ensureInvoiceStore();

    const Admin = require('../src/models/Admin');
    const Diagnostic = require('../src/models/Diagnostic');
    const Invoice = require('../src/models/Invoice');
    const admin = await Admin.create({
      username: 'phase4-invoice-test',
      passwordHash: await bcrypt.hash('Test-password-2026-only', 4),
      role: 'admin', tokenVersion: 0, passwordChangeRequired: false
    });
    const token = jwt.sign(
      { id: admin._id.toString(), role: 'admin', tokenVersion: 0 },
      process.env.JWT_SECRET,
      { expiresIn: '5m', issuer: 'dare-tech-api', audience: 'dare-tech-admin' }
    );
    const diagnostic = await Diagnostic.create({
      ticketNumber: `DT-${String(Date.now()).slice(-8)}`,
      brand: 'Prueba', model: 'Equipo temporal', issue: 'Prueba aislada de facturación',
      customerName: 'Cliente de prueba', customerContact: '0000000000', status: 'recibido'
    });

    const app = require('../src/app');
    server = await new Promise((resolve, reject) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
      listener.once('error', reject);
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const auth = { Authorization: `Bearer ${token}` };
    const jsonHeaders = { ...auth, 'Content-Type': 'application/json' };
    const results = [];
    const check = (name, fn) => results.push({ name, fn });

    check('seguridad: acceso a facturas sin token devuelve 401', async () => {
      assertStatus(await fetch(`${base}/facturas`), 401, 'GET sin token');
    });
    check('seguridad: CORS rechaza un origen ajeno', async () => {
      const response = await fetch(`${base}/facturas`, { headers: { Origin: 'https://origen-invalido.example' } });
      assertStatus(response, 403, 'CORS ajeno');
    });
    check('seguridad: cabeceras HTTP están presentes', async () => {
      const response = await fetch(`${base}/`);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('x-powered-by'), null);
    });
    check('validación: rechazo de operadores NoSQL en campos', async () => {
      const response = await fetch(`${base}/facturas`, {
        method: 'POST', headers: { ...jsonHeaders, 'Idempotency-Key': 'invalid-nosql-01' },
        body: JSON.stringify({ diagnosticId: { $ne: null }, items: [{ description: 'x', quantity: 1, unitPrice: 1 }] })
      });
      assertStatus(response, 400, 'ID NoSQL');
    });
    check('validación: cuerpo demasiado grande devuelve 413', async () => {
      const response = await fetch(`${base}/facturas`, {
        method: 'POST', headers: { ...jsonHeaders, 'Idempotency-Key': 'oversized-body-01' },
        body: JSON.stringify({ padding: 'x'.repeat(12000) })
      });
      assertStatus(response, 413, 'cuerpo grande');
    });

    const requests = [
      { key: 'phase4-invoice-flow-0001', items: [{ description: 'Pantalla', quantity: 2, unitPrice: 10 }] },
      { key: 'phase4-invoice-flow-0002', items: [{ description: 'Batería', quantity: 1, unitPrice: 5 }] },
      { key: 'phase4-invoice-flow-0003', items: [{ description: 'Mano de obra', quantity: 2, unitPrice: 4 }], discountCents: 100 }
    ];
    const created = [];
    check('flujo: crea tres facturas independientes con totales correctos', async () => {
      for (const request of requests) {
        const response = await fetch(`${base}/facturas`, {
          method: 'POST', headers: { ...jsonHeaders, 'Idempotency-Key': request.key },
          body: JSON.stringify({ diagnosticId: diagnostic._id.toString(), items: request.items, discountCents: request.discountCents || 0 })
        });
        assertStatus(response, 201, 'crear factura');
        created.push(await response.json());
      }
      assert.equal(new Set(created.map(invoice => invoice._id)).size, 3, 'cada POST debe insertar un documento distinto');
      const sequences = created.map(invoice => Number(invoice.invoiceNumber.slice(3)));
      assert.deepEqual(sequences, [sequences[0], sequences[0] + 1, sequences[0] + 2], 'numeración consecutiva');
      assert.deepEqual(created.map(invoice => invoice.totalCents), [2300, 575, 805], 'montos e IVA calculados en el servidor');
    });
    check('flujo: repetición de Idempotency-Key no duplica factura', async () => {
      const response = await fetch(`${base}/facturas`, {
        method: 'POST', headers: { ...jsonHeaders, 'Idempotency-Key': requests[0].key },
        body: JSON.stringify({ diagnosticId: diagnostic._id.toString(), items: requests[0].items })
      });
      assertStatus(response, 200, 'reintento idempotente');
      assert.equal((await response.json())._id, created[0]._id);
      assert.equal(await Invoice.countDocuments({ diagnosticId: diagnostic._id }), 3, 'conteo sigue en tres');
    });
    check('flujo: listado paginado y búsqueda devuelven datos actuales', async () => {
      const listing = await fetch(`${base}/facturas?page=1&limit=2&search=${diagnostic.ticketNumber}`, { headers: auth });
      assertStatus(listing, 200, 'listar facturas');
      const data = await listing.json();
      assert.equal(data.total, 3); assert.equal(data.items.length, 2); assert.equal(data.pages, 2);
      assert.equal(typeof data.ivaRateBps, 'number');
    });
    check('flujo: pago y anulación solo afectan los IDs seleccionados', async () => {
      const paid = await fetch(`${base}/facturas/${created[0]._id}`, {
        method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ status: 'pagada' })
      });
      assertStatus(paid, 200, 'pago recibido');
      const annulled = await fetch(`${base}/facturas/${created[1]._id}`, { method: 'DELETE', headers: auth });
      assertStatus(annulled, 200, 'anular factura');
      const persisted = await Invoice.find({ diagnosticId: diagnostic._id }).sort({ invoiceNumber: 1 }).lean();
      assert.equal(persisted.length, 3); assert.equal(persisted[0].status, 'pagada');
      assert.equal(persisted[1].status, 'anulada'); assert.equal(persisted[2].status, 'pendiente');
      assert.deepEqual(persisted.map(invoice => invoice.totalCents), [2300, 575, 805]);
    });
    check('seguridad: token inválido no permite crear, ver ni eliminar', async () => {
      const invalid = { Authorization: 'Bearer invalid.token.value' };
      assertStatus(await fetch(`${base}/facturas`, { headers: invalid }), 401, 'listar con token inválido');
      assertStatus(await fetch(`${base}/facturas/${created[2]._id}`, { headers: invalid }), 401, 'ver detalle con token inválido');
      assertStatus(await fetch(`${base}/facturas/${created[2]._id}`, { method: 'DELETE', headers: invalid }), 401, 'eliminar con token inválido');
      assertStatus(await fetch(`${base}/facturas`, {
        method: 'POST', headers: { ...invalid, 'Content-Type': 'application/json', 'Idempotency-Key': 'unauthorized-create-01' },
        body: JSON.stringify({ diagnosticId: diagnostic._id.toString(), items: [{ description: 'No autorizada', quantity: 1, unitPrice: 1 }] })
      }), 401, 'crear con token inválido');
      assert.equal((await Invoice.findById(created[2]._id)).status, 'pendiente');
      assert.equal(await Invoice.countDocuments({ diagnosticId: diagnostic._id }), 3, 'el intento no crea factura');
    });

    let passed = 0;
    for (const { name, fn } of results) {
      await fn(); passed++;
      console.log(`OK ${name}`);
    }
    console.log(`\n${passed}/${results.length} verificaciones completadas.`);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (dbCreated) {
      await mongoose.connection.dropDatabase();
      console.log(`Base temporal ${dbName} eliminada.`);
    }
    await mongoose.disconnect();
  }
}

run().catch(error => {
  console.error(`FALLO: ${error.message}`);
  process.exitCode = 1;
});
