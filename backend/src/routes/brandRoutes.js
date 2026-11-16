const express = require('express');
const router = express.Router();
const { getBrands } = require('../controllers/brandController');
const { body, param } = require('express-validator');
const protect = require('../middlewares/authMiddleware');
const adminRateLimiter = require('../middlewares/adminRateLimiter');
const { validate, onlyBodyFields } = require('../middlewares/validation');
const Brand = require('../models/Brand');

router.get('/', getBrands);
// Protege los cambios de marcas y modelos para el panel administrativo.
router.use(protect, adminRateLimiter);
// Crea o actualiza una marca con una lista limpia de modelos.
const brandFields = ['name', 'models'];
const nameRule = body('name').isString().trim().isLength({ min: 1, max: 80 });
const modelsRule = body('models').isArray({ max: 100 }), modelNamesRule = body('models.*').isString().trim().isLength({ min: 1, max: 100 });
router.post('/', onlyBodyFields(brandFields), nameRule, modelsRule, modelNamesRule, validate, async (req, res) => {
  try { return res.status(201).json(await Brand.create({ name: req.body.name, models: [...new Set(req.body.models)] })); }
  catch (error) { return res.status(error.code === 11000 ? 409 : 400).json({ message: 'No se pudo guardar la marca; verifica que el nombre no exista.' }); }
});
router.put('/:id', param('id').isMongoId(), onlyBodyFields(brandFields), nameRule, modelsRule, modelNamesRule, validate, async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, { name: req.body.name, models: [...new Set(req.body.models)] }, { new: true, runValidators: true });
    return brand ? res.json(brand) : res.status(404).json({ message: 'Marca no encontrada' });
  } catch (error) { return res.status(error.code === 11000 ? 409 : 400).json({ message: 'No se pudo guardar la marca; verifica que el nombre no exista.' }); }
});
// Elimina una marca seleccionada desde el catálogo administrativo.
router.delete('/:id', param('id').isMongoId(), validate, async (req, res) => {
  const brand = await Brand.findByIdAndDelete(req.params.id);
  return brand ? res.json({ message: 'Marca eliminada' }) : res.status(404).json({ message: 'Marca no encontrada' });
});

module.exports = router;
