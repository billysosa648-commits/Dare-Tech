// Verifica el honeypot, el tiempo mínimo, los duplicados y los límites de diagnósticos.
const assert = require('node:assert/strict');
process.env.DIAGNOSTIC_RATE_LIMIT_HOURLY = '5';
process.env.DIAGNOSTIC_RATE_LIMIT_DAILY = '20';
const { withTestApp, assertStatus } = require('./testSupport');

// Ejecuta las comprobaciones en una base temporal aislada.
withTestApp(async ({ base }) => {
  const postReport = (fields, ip = '198.51.100.10') => fetch(`${base}/diagnostics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify({ brand: 'Samsung', model: 'A15', issue: 'Pantalla rota prueba', customerName: 'Persona temporal', customerContact: '0990000000', website: '', formStartedAt: Date.now() - 5000, ...fields })
  });
  const honeypot = await postReport({ website: 'spam.example' }, '198.51.100.1');
  await assertStatus(honeypot, 400, 'honeypot');
  const instant = await postReport({ formStartedAt: Date.now() }, '198.51.100.2');
  await assertStatus(instant, 400, 'tiempo mínimo');
  const first = await postReport({}, '198.51.100.3');
  await assertStatus(first, 201, 'primer diagnóstico');
  const duplicate = await postReport({}, '198.51.100.4');
  await assertStatus(duplicate, 429, 'duplicado en 24 horas');

  // El cuarto problema del mismo contacto supera el tope diario configurado.
  for (let index = 1; index <= 3; index++) {
    await assertStatus(await postReport({ issue: `Problema distinto ${index}`, customerContact: '0999991000' }, `198.51.101.${index}`), 201, `envío diario ${index}`);
  }
  await assertStatus(await postReport({ issue: 'Problema distinto 4', customerContact: '0999991000' }, '198.51.101.4'), 429, 'tope diario por contacto');

  // El sexto envío desde la misma IP supera el límite horario predeterminado.
  for (let index = 0; index < 5; index++) {
    await assertStatus(await postReport({ issue: `IP rate ${index}`, customerContact: `09999920${index}` }, '198.51.102.10'), 201, `límite horario ${index + 1}`);
  }
  await assertStatus(await postReport({ issue: 'IP rate 6', customerContact: '0999992099' }, '198.51.102.10'), 429, 'sexto envío por IP');

  assert.equal(await require('../src/models/Diagnostic').countDocuments({}), 9);
  console.log('OK antispam: honeypot, tiempo, duplicados, tope por contacto y límites por IP.');
});
