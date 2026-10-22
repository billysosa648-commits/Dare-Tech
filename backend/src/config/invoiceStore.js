const Invoice = require('../models/Invoice');
const Counter = require('../models/Counter');

async function ensureInvoiceStore() {
  const db = Invoice.db.db;
  const exists = await db.listCollections({ name: Invoice.collection.name }).hasNext();
  if (!exists) await Invoice.createCollection();

  const [indexes, legacyCount] = await Promise.all([
    Invoice.collection.indexes(),
    Invoice.collection.countDocuments({ $or: [{ invoiceNumber: { $exists: false } }, { invoiceNumber: null }] })
  ]);
  if (legacyCount) {
    throw new Error(`Hay ${legacyCount} facturas antiguas sin migrar. Ejecuta: npm run migrate:invoices -- --apply`);
  }
  if (indexes.some(index => index.unique && index.key?.diagnosticId === 1)) {
    throw new Error('Existe un índice único por diagnóstico; ejecuta la migración de facturas antes de iniciar');
  }

  const invoiceNumberIndex = indexes.find(index => index.unique && index.key?.invoiceNumber === 1);
  if (!invoiceNumberIndex) await Invoice.collection.createIndex({ invoiceNumber: 1 }, { unique: true, name: 'invoice_number_unique' });
  const idempotencyIndex = indexes.find(index => index.unique && index.key?.idempotencyKey === 1);
  if (!idempotencyIndex) await Invoice.collection.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true, name: 'invoice_idempotency_unique' });
  if (!indexes.some(index => index.key?.diagnosticId === 1 && !index.unique)) {
    await Invoice.collection.createIndex({ diagnosticId: 1 }, { name: 'invoice_diagnostic_lookup' });
  }

  const numbered = await Invoice.collection.find({}, { projection: { invoiceNumber: 1 } }).toArray();
  const maxSequence = numbered.reduce((max, { invoiceNumber }) => {
    const match = /^DT-(\d+)$/.exec(invoiceNumber || '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  await Counter.collection.updateOne({ _id: 'invoice' }, { $max: { seq: maxSequence } }, { upsert: true });
}

module.exports = ensureInvoiceStore;
