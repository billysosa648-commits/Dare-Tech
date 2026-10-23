const Diagnostic = require('../models/Diagnostic');
const Counter = require('../models/Counter');

async function createTicket(ticketData, session = null, origin = 'report') {
  const attempts = session ? 1 : 5;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const options = { upsert: true, returnDocument: 'after' };
    if (session) options.session = session;
    const counter = await Counter.findOneAndUpdate(
      { _id: 'ticket' }, { $inc: { seq: 1 } }, options
    );
    const ticketNumber = `DT-${String(counter.seq).padStart(5, '0')}`;
    const diagnostic = {
      ticketNumber,
      brand: ticketData.brand.trim(),
      model: ticketData.model?.trim() || '',
      issue: ticketData.issue.trim(),
      customerName: ticketData.customerName.trim(),
      customerContact: ticketData.customerContact.trim(),
      origin,
      status: 'recibido',
      statusHistory: [{ status: 'recibido', note: 'Diagnóstico recibido' }]
    };
    try {
      const [created] = await Diagnostic.create([diagnostic], session ? { session } : undefined);
      return created;
    } catch (error) {
      if (error.code !== 11000 || attempt === attempts - 1) throw error;
    }
  }
}

module.exports = createTicket;
