// Define el endpoint público de configuración limitada para formularios del sitio.
const express = require('express');
const { getPublicConfig } = require('../controllers/publicConfigController');

// Configura las rutas públicas de navegador.
const router = express.Router();
router.get('/', getPublicConfig);

// Exporta el router de configuración.
module.exports = router;
