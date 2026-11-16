// Verifica coincidencia de FAQ, respuesta de respaldo, tickets públicos y CRUD.
const assert = require('node:assert/strict');
const { withTestApp, createTestDiagnostic, assertStatus } = require('./testSupport');

// Comprueba preguntas públicas y acciones CRUD protegidas del panel.
withTestApp(async ({ base, auth, jsonHeaders }) => {
  const Faq = require('../src/models/Faq');
  await Faq.create({ question: '¿Dónde están ubicados?', answer: 'Dare-Tech está en Guayaquil, Ecuador.', keywords: ['ubicacion', 'guayaquil'], category: 'contacto', active: true, order: 1 });
  const match = await fetch(`${base}/chatbot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Dígame la ubicación de ustedes' }) });
  await assertStatus(match, 200, 'coincidencia');
  assert.match((await match.json()).answer, /Guayaquil/);
  const fallback = await fetch(`${base}/chatbot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '¿Venden repuestos para motos?' }) });
  const fallbackData = await fallback.json();
  await assertStatus(fallback, 200, 'respaldo');
  assert.equal(fallbackData.suggestions.length, 3);
  assert.match(fallbackData.answer, /WhatsApp/);

  const diagnostic = await createTestDiagnostic({ status: 'en_revision' });
  const ticketResponse = await fetch(`${base}/chatbot`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Estado del ticket ${diagnostic.ticketNumber}` }) });
  const ticketData = await ticketResponse.json();
  await assertStatus(ticketResponse, 200, 'ticket público');
  assert.match(ticketData.answer, new RegExp(diagnostic.ticketNumber));
  assert.match(ticketData.answer, /en revision/);
  assert(!JSON.stringify(ticketData).includes(diagnostic.customerContact));
  assert(!JSON.stringify(ticketData).includes(diagnostic._id.toString()));

  await assertStatus(await fetch(`${base}/faqs`), 401, 'CRUD sin JWT');
  const list = await fetch(`${base}/faqs`, { headers: auth });
  await assertStatus(list, 200, 'listar FAQs admin');
  const create = await fetch(`${base}/faqs`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ question: '¿Qué equipos reparan?', answer: 'Celulares y dispositivos electrónicos.', keywords: ['equipos'], category: 'servicios', active: true, order: 2 }) });
  await assertStatus(create, 201, 'crear FAQ admin');
  const created = await create.json();
  await assertStatus(await fetch(`${base}/faqs/${created._id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ active: false, order: 10 }) }), 200, 'editar y desactivar FAQ');
  await assertStatus(await fetch(`${base}/faqs/reorder`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ items: [{ id: created._id, order: 3 }] }) }), 200, 'ordenar FAQs');
  await assertStatus(await fetch(`${base}/faqs/${created._id}`, { method: 'DELETE', headers: auth }), 200, 'eliminar FAQ');
  console.log('OK chatbot: coincidencia, respaldo, seguimiento público y CRUD protegido de FAQs.');
});
