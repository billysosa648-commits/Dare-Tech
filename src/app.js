const express = require('express');
const cors = require('cors');

const brandRoutes = require('./routes/brandRoutes');
const diagnosticRoutes = require('./routes/diagnosticRoutes');

const app = express();

const authRoutes = require('./routes/authRoutes');

const invoiceRoutes = require('./routes/invoiceRoutes');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'API de Dare-Tech funcionando 🚀' });
});

app.use('/api/invoices', invoiceRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/diagnostics', diagnosticRoutes);

module.exports = app;