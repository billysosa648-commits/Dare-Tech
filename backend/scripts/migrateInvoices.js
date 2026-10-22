require('dotenv').config();
const mongoose = require('mongoose');

const applyChanges = process.argv.includes('--apply');
const escape = value => String(value || '').replace(/[\r\n]/g, ' ');

async function main() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI no está configurado');
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const invoices = db.collection('invoices');
  const diagnostics = db.collection('diagnostics');
  const counters = db.collection('counters');
  const records = await invoices.find({}).sort({ createdAt: 1, _id: 1 }).toArray();
  const indexes = await invoices.indexes().catch(error => error.codeName === 'NamespaceNotFound' ? [] : Promise.reject(error));
  const legacyUniqueDiagnosticIndexes = indexes.filter(index => index.unique && index.key?.diagnosticId === 1);
  let maxSequence = records.reduce((max, invoice) => {
    const match = /^DT-(\d+)$/.exec(invoice.invoiceNumber || '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  const withoutNumber = records.filter(invoice => !invoice.invoiceNumber).length;

  console.log(`Facturas encontradas: ${records.length}`);
  console.log(`Facturas que requieren número: ${withoutNumber}`);
  console.log(`Índices únicos por diagnosticId que se retirarían: ${legacyUniqueDiagnosticIndexes.map(index => index.name).join(', ') || 'ninguno'}`);
  console.log(`Modo: ${applyChanges ? 'APLICAR' : 'solo diagnóstico; no se modificó la base'}`);
  if (!applyChanges) {
    console.log('Haz un respaldo y detén el backend antes de ejecutar con --apply.');
    return;
  }

  // La migración es reanudable: conserva números ya asignados y completa los faltantes.
  for (const invoice of records) {
    const diagnostic = await diagnostics.findOne({ _id: invoice.diagnosticId }, { projection: { ticketNumber: 1, customerName: 1, customerContact: 1 } });
    const oldItems = Array.isArray(invoice.items) ? invoice.items : [];
    const items = oldItems.map(item => {
      const unitPriceCents = Number.isInteger(item.unitPriceCents)
        ? item.unitPriceCents
        : Math.round((Number(item.price) || 0) * 100);
      const quantity = Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      return {
        description: String(item.description || 'Servicio').trim().slice(0, 200),
        quantity,
        unitPriceCents,
        subtotalCents: Number.isInteger(item.subtotalCents) ? item.subtotalCents : unitPriceCents * quantity
      };
    });
    const legacyTotalCents = Number.isInteger(invoice.totalCents)
      ? invoice.totalCents
      : Math.round((Number(invoice.total) || items.reduce((sum, item) => sum + item.subtotalCents, 0) / 100) * 100);
    const number = invoice.invoiceNumber || `DT-${String(++maxSequence).padStart(6, '0')}`;
    const set = {
      invoiceNumber: number,
      ticketNumber: invoice.ticketNumber || diagnostic?.ticketNumber || 'TICKET-LEGACY',
      customer: invoice.customer || {
        name: diagnostic?.customerName || 'Cliente histórico',
        contact: diagnostic?.customerContact || 'Sin contacto registrado'
      },
      issuedAt: invoice.issuedAt || invoice.createdAt || new Date(),
      status: ['pendiente', 'pagada', 'anulada'].includes(invoice.status) ? invoice.status : 'pendiente',
      items,
      subtotalCents: Number.isInteger(invoice.subtotalCents) ? invoice.subtotalCents : legacyTotalCents,
      ivaRateBps: Number.isInteger(invoice.ivaRateBps) ? invoice.ivaRateBps : 0,
      ivaCents: Number.isInteger(invoice.ivaCents) ? invoice.ivaCents : 0,
      discountCents: Number.isInteger(invoice.discountCents) ? invoice.discountCents : 0,
      totalCents: legacyTotalCents,
      notes: invoice.notes || '',
      annulledAt: invoice.annulledAt || null,
      annulledBy: invoice.annulledBy || null
    };
    // Reemplazar el arreglo completo ya elimina el campo legacy `price` de sus subdocumentos.
    await invoices.updateOne({ _id: invoice._id }, { $set: set, $unset: { total: '' } });
  }

  for (const index of legacyUniqueDiagnosticIndexes) await invoices.dropIndex(index.name);
  const currentIndexes = await invoices.indexes();
  if (!currentIndexes.some(index => index.unique && index.key?.invoiceNumber === 1)) {
    await invoices.createIndex({ invoiceNumber: 1 }, { unique: true, name: 'invoice_number_unique' });
  }
  if (!currentIndexes.some(index => index.unique && index.key?.idempotencyKey === 1)) {
    await invoices.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true, name: 'invoice_idempotency_unique' });
  }
  if (!currentIndexes.some(index => index.key?.diagnosticId === 1 && !index.unique)) {
    await invoices.createIndex({ diagnosticId: 1 }, { name: 'invoice_diagnostic_lookup' });
  }
  if (!currentIndexes.some(index => index.key?.status === 1 && index.key?.createdAt === -1)) {
    await invoices.createIndex({ status: 1, createdAt: -1 }, { name: 'invoice_status_created' });
  }
  if (!currentIndexes.some(index => index.key?.createdAt === -1 && index.key?._id === -1)) {
    await invoices.createIndex({ createdAt: -1, _id: -1 }, { name: 'invoice_created_id' });
  }
  await counters.updateOne({ _id: 'invoice' }, { $max: { seq: maxSequence } }, { upsert: true });
  console.log(`Migración terminada. Próximo número: DT-${String(maxSequence + 1).padStart(6, '0')}`);
}

main().catch(error => {
  console.error(`Migración de facturas falló: ${escape(error.message)}`);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect();
});
