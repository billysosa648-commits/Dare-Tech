// Expone servicios públicos y protege su mantenimiento administrativo.
const express = require('express');
const { body, param } = require('express-validator');
const Service = require('../models/Service');
const protect = require('../middlewares/authMiddleware');
const adminRateLimiter = require('../middlewares/adminRateLimiter');
const { validate, onlyBodyFields } = require('../middlewares/validation');

// Define reglas para crear y editar servicios con los mismos límites.
const router = express.Router();
const fields = ['name', 'icon', 'description', 'category', 'estimatedTime', 'active', 'order'];
const rules = () => [body('name').optional().isString().trim().isLength({ min: 1, max: 100 }), body('icon').optional().isString().trim().isLength({ max: 16 }), body('description').optional().isString().trim().isLength({ min: 1, max: 1000 }), body('category').optional().isString().trim().isLength({ min: 1, max: 60 }), body('estimatedTime').optional().isString().trim().isLength({ max: 100 }), body('active').optional().isBoolean().toBoolean(), body('order').optional().isInt({ min: 0, max: 10000 }).toInt()];
// Publica únicamente servicios activos y ordenados.
router.get('/', async (req, res) => res.json(await Service.find({ active: true }).sort({ order: 1, _id: 1 }).lean()));
// Protege todas las operaciones de gestión desde este punto.
router.use(protect, adminRateLimiter);
// Lista servicios activos e inactivos para administración.
router.get('/admin', async (req, res) => res.json(await Service.find().sort({ order: 1, _id: 1 }).lean()));
// Crea un servicio validado en el panel.
router.post('/', onlyBodyFields(fields), body('name').isString().trim().isLength({ min: 1, max: 100 }), body('description').isString().trim().isLength({ min: 1, max: 1000 }), body('category').isString().trim().isLength({ min: 1, max: 60 }), ...rules(), validate, async (req, res) => res.status(201).json(await Service.create(req.body)));
// Actualiza los campos editables de un servicio existente.
router.patch('/:id', param('id').isMongoId(), onlyBodyFields(fields), ...rules(), validate, async (req, res) => {
  const service = await Service.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  return service ? res.json(service) : res.status(404).json({ message: 'Servicio no encontrado' });
});
// Elimina un servicio que ya no se ofrece.
router.delete('/:id', param('id').isMongoId(), validate, async (req, res) => {
  const service = await Service.findByIdAndDelete(req.params.id);
  return service ? res.json({ message: 'Servicio eliminado' }) : res.status(404).json({ message: 'Servicio no encontrado' });
});

module.exports = router;
