// Verifica el límite diario por IP sin que el límite horario lo alcance primero.
process.env.DIAGNOSTIC_RATE_LIMIT_HOURLY = '100';
process.env.DIAGNOSTIC_RATE_LIMIT_DAILY = '20';
const { withTestApp, assertStatus } = require('./testSupport');

// Envía veinte solicitudes separadas desde una IP y confirma el rechazo de la siguiente.
withTestApp(async ({ base }) => {
  const send = index => fetch(`${base}/diagnostics`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.200' },
    body: JSON.stringify({
      brand: 'Marca temporal', model: 'Modelo temporal', issue: `Reporte diario ${index}`,
      customerName: 'Cliente temporal', customerContact: `099${String(index).padStart(7, '0')}`,
      website: '', formStartedAt: Date.now() - 5000
    })
  });
  for (let index = 1; index <= 20; index++) await assertStatus(await send(index), 201, `reporte diario ${index}`);
  await assertStatus(await send(21), 429, 'vigésimo primer reporte diario');
  console.log('OK límite diario de solicitudes por IP.');
});
