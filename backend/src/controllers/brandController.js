const Brand = require('../models/Brand');

// Obtiene todas las marcas con sus modelos
async function getBrands(req, res) {
  try {
    const brands = await Brand.find().sort({ name: 1 });
    res.json(brands);
  } catch (error) {
    console.error('Error al obtener marcas:', error.message);
    res.status(500).json({ message: 'No se pudieron obtener las marcas' });
  }
}

module.exports = { getBrands };
