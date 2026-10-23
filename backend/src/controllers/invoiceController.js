const crypto = require('crypto');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Counter = require('../models/Counter');
const Diagnostic = require('../models/Diagnostic');
const createTicket = require('../services/ticketService');

const MAX_INVOICE_CENTS = 3_000_000_000;

function moneyToCents(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) throw new Error('Precio fuera de rango');
  const cents = Math.round((amount + Number.EPSILON) * 100);
  if (Math.abs(amount * 100 - cents) > 0.00001) throw new Error('El precio admite máximo dos decimales');
  return cents;
}

function normaliseItems(items) {
  return items.map(item => {
    const description = String(item.description).trim();
    const quantity = item.quantity === undefined ? 1 : Number(item.quantity);
    const unitPriceCents = moneyToCents(item.unitPrice === undefined ? item.price : item.unitPrice);
    if (!description || description.length > 200 || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000) {
      throw new Error('Ítem de factura inválido');
    }
    const subtotalCents = quantity * unitPriceCents;
    if (!Number.isSafeInteger(subtotalCents) || subtotalCents > MAX_INVOICE_CENTS) throw new Error('Subtotal fuera de rango');
    return { description, quantity, unitPriceCents, subtotalCents };
  });
}

function calculateTotals(items, discountCents = 0, ivaRateBps = getIvaRateBps()) {
  const subtotalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0);
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents > MAX_INVOICE_CENTS) throw new Error('Subtotal fuera de rango');
  if (!Number.isInteger(discountCents) || discountCents < 0 || discountCents > subtotalCents) {
    throw new Error('El descuento debe ser un valor en centavos menor o igual al subtotal');
  }
  const taxableCents = subtotalCents - discountCents;
  const ivaCents = Math.round((taxableCents * ivaRateBps) / 10000);
  const totalCents = taxableCents + ivaCents;
  if (totalCents > MAX_INVOICE_CENTS) throw new Error('Total fuera de rango');
  return { subtotalCents, ivaRateBps, ivaCents, discountCents, totalCents };
}

function getIvaRateBps() {
  const configured = Number(process.env.INVOICE_IVA_RATE ?? 15);
  if (!Number.isFinite(configured) || configured < 0 || configured > 15) {
    throw new Error('INVOICE_IVA_RATE debe ser un porcentaje entre 0 y 15');
  }
  return Math.round(configured * 100);
}

function serializeInvoice(invoice, { publicView = false } = {}) {
  const record = typeof invoice.toObject === 'function' ? invoice.toObject() : invoice;
  const items = (record.items || []).map(item => {
    const unitPriceCents = Number.isInteger(item.unitPriceCents)
      ? item.unitPriceCents
      : Math.round((Number(item.price) || 0) * 100);
    const quantity = Number.isInteger(item.quantity) ? item.quantity : 1;
    const subtotalCents = Number.isInteger(item.subtotalCents) ? item.subtotalCents : unitPriceCents * quantity;
    return {
      ...item,
      quantity,
      unitPriceCents,
      unitPrice: unitPriceCents / 100,
      subtotalCents,
      subtotal: subtotalCents / 100,
      price: subtotalCents / 100
    };
  });
  const subtotalCents = Number.isInteger(record.subtotalCents)
    ? record.subtotalCents
    : Math.round((Number(record.total) || 0) * 100);
  const totalCents = Number.isInteger(record.totalCents)
    ? record.totalCents
    : Math.round((Number(record.total) || 0) * 100);
  const ivaCents = Number.isInteger(record.ivaCents) ? record.ivaCents : 0;
  const discountCents = Number.isInteger(record.discountCents) ? record.discountCents : 0;
  const serialized = {
    ...record,
    items,
    subtotalCents,
    subtotal: subtotalCents / 100,
    ivaRateBps: record.ivaRateBps ?? 0,
    ivaRate: (record.ivaRateBps ?? 0) / 100,
    ivaCents,
    iva: ivaCents / 100,
    discountCents,
    discount: discountCents / 100,
    totalCents,
    total: totalCents / 100
  };
  delete serialized.idempotencyKey;
  delete serialized.annulledBy;
  if (publicView) {
    delete serialized._id;
    delete serialized.diagnosticId;
    delete serialized.customer;
  }
  return serialized;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function createInvoice(req, res) {
  const session = await mongoose.startSession();
  let result;
  let created = false;
  const idempotencyKey = req.get('Idempotency-Key') || crypto.randomUUID();
  try {
    const items = normaliseItems(req.body.items);
    const discountCents = req.body.discountCents ?? 0;
    const totals = calculateTotals(items, discountCents);
    await session.withTransaction(async () => {
      result = await Invoice.findOne({ idempotencyKey }).session(session);
      if (result) return;
      const diagnostic = req.body.ticket
        ? await createTicket(req.body.ticket, session, 'invoice')
        : await Diagnostic.findById(req.body.diagnosticId).session(session);
      if (!diagnostic) {
        const error = new Error('El diagnóstico no existe');
        error.status = 404;
        throw error;
      }
      const counter = await Counter.findOneAndUpdate(
        { _id: 'invoice' }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after', session }
      );
      const invoiceNumber = `DT-${String(counter.seq).padStart(6, '0')}`;
      const [invoice] = await Invoice.create([{
        invoiceNumber,
        diagnosticId: diagnostic._id,
        ticketNumber: diagnostic.ticketNumber,
        customer: { name: diagnostic.customerName, contact: diagnostic.customerContact },
        issuedAt: new Date(),
        status: 'pendiente',
        items,
        ...totals,
        notes: req.body.notes || '',
        idempotencyKey
      }], { session });
      result = invoice;
      created = true;
    });
    return res.status(created ? 201 : 200).json(serializeInvoice(result));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 11000) {
      const previous = await Invoice.findOne({ idempotencyKey }).lean();
      if (previous) return res.status(200).json(serializeInvoice(previous));
      return res.status(409).json({ message: 'No se pudo reservar un número único de factura. Intenta nuevamente.' });
    }
    if (/fuera de rango|máximo dos decimales|Ítem de factura inválido|descuento/.test(error.message)) {
      return res.status(400).json({ message: error.message });
    }
    console.error('Error al crear factura:', error.message);
    return res.status(500).json({ message: 'No se pudo crear la factura' });
  } finally {
    await session.endSession();
  }
}

async function updateInvoice(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
    if (invoice.status !== 'pendiente') return res.status(409).json({ message: 'Solo se pueden agregar ítems a facturas pendientes' });
    const incomingItems = normaliseItems(req.body.items);
    const isLegacyAlias = req.baseUrl === '/api/invoices';
    const allItems = isLegacyAlias
      ? [...invoice.items.map(item => item.toObject()), ...incomingItems]
      : incomingItems;
    if (allItems.length > 30) return res.status(400).json({ message: 'La factura no puede superar 30 ítems' });
    const discountCents = req.body.discountCents ?? invoice.discountCents;
    const totals = calculateTotals(allItems, discountCents, invoice.ivaRateBps);
    invoice.items = allItems;
    if (req.body.notes !== undefined) invoice.notes = req.body.notes;
    Object.assign(invoice, totals);
    await invoice.save();
    return res.json(serializeInvoice(invoice));
  } catch (error) {
    if (/fuera de rango|máximo dos decimales|Ítem de factura inválido|descuento/.test(error.message)) {
      return res.status(400).json({ message: error.message });
    }
    console.error('Error al agregar ítems a factura:', error.message);
    return res.status(500).json({ message: 'No se pudieron agregar ítems a la factura' });
  }
}

async function listInvoices(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(4, Math.max(1, Number.parseInt(req.query.limit, 10) || 4));
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { invoiceNumber: pattern }, { ticketNumber: pattern },
        { 'customer.name': pattern }, { 'customer.contact': pattern }
      ];
    }
    const [invoices, total] = await Promise.all([
      Invoice.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Invoice.countDocuments(filter)
    ]);
    return res.json({ items: invoices.map(serializeInvoice), page, limit, total, pages: Math.ceil(total / limit), ivaRateBps: getIvaRateBps() });
  } catch (error) {
    console.error('Error al listar facturas:', error.message);
    return res.status(500).json({ message: 'No se pudieron listar las facturas' });
  }
}

async function getInvoiceById(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.id).lean();
    if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
    return res.json(serializeInvoice(invoice));
  } catch (error) {
    console.error('Error al obtener factura:', error.message);
    return res.status(500).json({ message: 'No se pudo obtener la factura' });
  }
}

async function getInvoiceByDiagnostic(req, res) {
  try {
    const invoice = await Invoice.findOne({ diagnosticId: req.params.diagnosticId, status: { $ne: 'anulada' } })
      .sort({ createdAt: -1, _id: -1 }).lean();
    if (!invoice) return res.status(404).json({ message: 'No hay factura para este diagnóstico' });
    return res.json(serializeInvoice(invoice));
  } catch (error) {
    console.error('Error al obtener factura por diagnóstico:', error.message);
    return res.status(500).json({ message: 'No se pudo obtener la factura' });
  }
}

async function updateInvoiceStatus(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
    if (invoice.status === 'anulada') return res.status(409).json({ message: 'La factura está anulada' });
    if (req.body.status) invoice.status = req.body.status;
    if (req.body.paymentMethod !== undefined) invoice.paymentMethod = req.body.paymentMethod;
    if (req.body.notes !== undefined) invoice.notes = req.body.notes;
    if (req.body.customerName !== undefined) invoice.customer.name = req.body.customerName;
    await invoice.save();
    return res.json(serializeInvoice(invoice));
  } catch (error) {
    console.error('Error al actualizar factura:', error.message);
    return res.status(500).json({ message: 'No se pudo actualizar la factura' });
  }
}

async function markInvoiceAsPaid(req, res) {
  req.body = { status: 'pagada' };
  return updateInvoiceStatus(req, res);
}

async function annulInvoice(req, res) {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Factura no encontrada' });
    if (invoice.status === 'anulada') return res.status(409).json({ message: 'La factura ya está anulada' });
    invoice.status = 'anulada';
    invoice.annulledAt = new Date();
    invoice.annulledBy = req.admin.id;
    await invoice.save();
    return res.json({ message: 'Factura anulada', invoice: serializeInvoice(invoice) });
  } catch (error) {
    console.error('Error al anular factura:', error.message);
    return res.status(500).json({ message: 'No se pudo anular la factura' });
  }
}

module.exports = {
  createInvoice, updateInvoice, listInvoices, getInvoiceById,
  getInvoiceByDiagnostic, updateInvoiceStatus, markInvoiceAsPaid, annulInvoice, serializeInvoice
};
