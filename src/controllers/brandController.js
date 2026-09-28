const Brand = require('../models/Brand');

// Obtiene todas las marcas con sus modelos
async function getBrands(req, res) {
  try {
    const brands = await Brand.find().sort({ name: 1 });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las marcas', error: error.message });
  }
}

module.exports = { getBrands };