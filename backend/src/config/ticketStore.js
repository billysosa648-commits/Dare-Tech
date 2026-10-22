const Diagnostic = require('../models/Diagnostic');
const Counter = require('../models/Counter');

async function ensureTicketCounter() {
  const db = Diagnostic.db.db;
  const collectionExists = await db.listCollections({ name: Diagnostic.collection.name }).hasNext();
  if (!collectionExists) await Diagnostic.createCollection();

  const indexes = await Diagnostic.collection.indexes();
  if (!indexes.some(index => index.unique && index.key?.ticketNumber === 1)) {
    await Diagnostic.collection.createIndex({ ticketNumber: 1 }, { unique: true, name: 'ticket_number_unique' });
  }

  const tickets = await Diagnostic.find({ ticketNumber: /^DT-\d+$/ })
    .select('ticketNumber').lean();
  const maxSequence = tickets.reduce((max, { ticketNumber }) => {
    const match = /^DT-(\d+)$/.exec(ticketNumber || '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  try {
    await Counter.collection.updateOne(
      { _id: 'ticket' }, { $max: { seq: maxSequence } }, { upsert: true }
    );
  } catch (error) {
    // Permite que varias instancias inicialicen el contador al mismo tiempo.
    if (error.code !== 11000) throw error;
    await Counter.collection.updateOne({ _id: 'ticket' }, { $max: { seq: maxSequence } });
  }
}

module.exports = ensureTicketCounter;
