// Administra el contenido de preguntas frecuentes con operaciones CRUD protegidas.
const Faq = require('../models/Faq');

// Lista todas las preguntas en su orden administrativo.
async function listFaqs(req, res) {
  try { return res.json(await Faq.find().sort({ order: 1, _id: 1 }).lean()); }
  catch (error) { console.error('Error al listar FAQs:', error.message); return res.status(500).json({ message: 'No se pudieron listar las preguntas' }); }
}

// Crea una pregunta frecuente desde el panel.
async function createFaq(req, res) {
  try { return res.status(201).json(await Faq.create(req.body)); }
  catch (error) { console.error('Error al crear FAQ:', error.message); return res.status(500).json({ message: 'No se pudo crear la pregunta' }); }
}

// Actualiza contenido, estado o posición de una pregunta.
async function updateFaq(req, res) {
  try {
    const faq = await Faq.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    return faq ? res.json(faq) : res.status(404).json({ message: 'Pregunta no encontrada' });
  } catch (error) { console.error('Error al actualizar FAQ:', error.message); return res.status(400).json({ message: 'No se pudo actualizar la pregunta' }); }
}

// Elimina una pregunta que ya no debe aparecer en el contenido.
async function deleteFaq(req, res) {
  try {
    const faq = await Faq.findByIdAndDelete(req.params.id);
    return faq ? res.json({ message: 'Pregunta eliminada' }) : res.status(404).json({ message: 'Pregunta no encontrada' });
  } catch (error) { console.error('Error al eliminar FAQ:', error.message); return res.status(500).json({ message: 'No se pudo eliminar la pregunta' }); }
}

// Reordena un conjunto explícito de FAQs sin aceptar filtros vacíos.
async function reorderFaqs(req, res) {
  try {
    const operations = req.body.items.map(({ id, order }) => ({ updateOne: { filter: { _id: id }, update: { $set: { order } } } }));
    const result = await Faq.bulkWrite(operations, { ordered: true });
    return res.json({ modifiedCount: result.modifiedCount });
  } catch (error) { console.error('Error al ordenar FAQs:', error.message); return res.status(400).json({ message: 'No se pudo ordenar las preguntas' }); }
}

// Exporta acciones para las rutas administrativas.
module.exports = { listFaqs, createFaq, updateFaq, deleteFaq, reorderFaqs };
