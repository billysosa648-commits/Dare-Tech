const express = require('express');
const router = express.Router();
const { getBrands } = require('../controllers/brandController');

router.get('/', getBrands);

module.exports = router;