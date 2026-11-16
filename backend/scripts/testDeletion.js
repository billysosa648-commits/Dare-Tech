// Verifica borrados simples y múltiples, conflictos 409 y eventos de auditoría.
const assert = require('node:assert/strict');
const { withTestApp, createTestDiagnostic, createTestInvoice, assertStatus } = require('./testSupport');

// Ejecuta los flujos de borrado y confirma que los registros relacionados son coherentes.
withTestApp(async ({ base, auth, jsonHeaders }) => {
  const diagnostic = await createTestDiagnostic();
  const invoice = await createTestInvoice(diagnostic);
  const conflict = await fetch(`${base}/diagnostics/${diagnostic._id}`, { method: 'DELETE', headers: auth });
  await assertStatus(conflict, 409, 'diagnóstico con factura');
  const conflictData = await conflict.json();
  assert.equal(conflictData.invoices[0].invoiceNumber, invoice.invoiceNumber);
  await assertStatus(await fetch(`${base}/diagnostics/${diagnostic._id}?withInvoices=true`, { method: 'DELETE', headers: auth }), 200, 'eliminación explícita relacionada');

  const singleInvoiceDiagnostic = await createTestDiagnostic();
  const singleInvoice = await createTestInvoice(singleInvoiceDiagnostic);
  await assertStatus(await fetch(`${base}/invoices/${singleInvoice._id}`, { method: 'DELETE', headers: auth }), 200, 'borrado simple de factura');

  const invoiceBatch = [];
  for (let index = 0; index < 2; index++) invoiceBatch.push(await createTestInvoice(await createTestDiagnostic()));
  const bulkInvoiceResponse = await fetch(`${base}/invoices/bulk-delete`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ ids: invoiceBatch.map(row => row._id) }) });
  await assertStatus(bulkInvoiceResponse, 200, 'borrado múltiple de facturas');
  assert.equal((await bulkInvoiceResponse.json()).deletedCount, 2);

  const linkedDiagnostic = await createTestDiagnostic();
  const linkedInvoice = await createTestInvoice(linkedDiagnostic);
  const plainDiagnostic = await createTestDiagnostic();
  const bulkBody = { ids: [linkedDiagnostic._id.toString(), plainDiagnostic._id.toString()] };
  await assertStatus(await fetch(`${base}/diagnostics/bulk-delete`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(bulkBody) }), 409, 'conflicto de borrado múltiple');
  const bulkResponse = await fetch(`${base}/diagnostics/bulk-delete`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ ...bulkBody, withInvoices: true }) });
  await assertStatus(bulkResponse, 200, 'borrado múltiple explícito');
  assert.equal((await bulkResponse.json()).deletedCount, 2);
  await assertStatus(await fetch(`${base}/invoices/bulk-delete`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ ids: [] }) }), 400, 'lote vacío');

  const AuditLog = require('../src/models/AuditLog');
  const logs = await AuditLog.find().lean();
  assert(logs.length >= 7, 'cada documento eliminado debe tener un evento de auditoría');
  assert(logs.every(log => log.actorId && log.entityType && log.entityId && log.reference && log.ipAddress && log.occurredAt));
  assert(logs.every(log => !('customer' in log) && !('customerName' in log) && !('customerContact' in log)));
  console.log('OK borrados: simple, múltiple, 409, confirmación y auditoría sin datos personales.');
});
