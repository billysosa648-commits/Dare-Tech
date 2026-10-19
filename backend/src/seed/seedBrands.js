require('dotenv').config();
const mongoose = require('mongoose');
const Brand = require('../models/Brand');

const brandsToInsert = [
  { name: 'Apple', models: ['iPhone Con version de ios 26.1 o inferior ya formateado', 'iPhone 6', 'iPhone 7', 'Iphone 8', 'iPhone X'] },
  { name: 'Samsung', models: ['A15', 'A55', 'A02', 'A16', 'A34', 'S22', 'S25' ]  },
  { name: 'Xiaomi', models: ['Redmi Note 13', 'Poco X6 Pro', 'Xiaomi 14', 'Redmi 12', 'Xiaomi ultima generacion' ] },
  { name: 'Motorola', models: ['Edge 40', 'Moto G56', 'Moto G 2025', 'Moto G 5G'] },
  { name: 'HP', models: ['Pavilion', 'Victus', 'Spectre', 'ProBook'] },
  { name: 'Lenovo', models: ['ThinkPad', 'Legion', 'IdeaPad', 'Yoga'] },
  { name: 'Otro', models: [] }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    for (const brand of brandsToInsert) {
      await Brand.findOneAndUpdate(
        { name: brand.name },
        { name: brand.name, models: brand.models },
        { upsert: true, new: true }
      );
      console.log(`→ Insertada/actualizada: ${brand.name}`);
    }

    console.log('🎉 Seed completado');
  } catch (error) {
    console.error('❌ Error en el seed:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();