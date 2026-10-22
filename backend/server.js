require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const ensureInvoiceStore = require('./src/config/invoiceStore');

const PORT = process.env.PORT || 4000;

if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET, 'utf8') < 32) {
  throw new Error('JWT_SECRET debe estar configurado con al menos 32 bytes aleatorios');
}
if (!process.env.MONGO_URI) throw new Error('MONGO_URI debe estar configurado');

connectDB().then(ensureInvoiceStore).then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
  });
});
