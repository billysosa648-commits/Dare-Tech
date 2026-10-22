const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const hpp = require('hpp');

const brandRoutes = require('./routes/brandRoutes');
const diagnosticRoutes = require('./routes/diagnosticRoutes');

const app = express();
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
app.set('trust proxy', Number.isInteger(trustProxyHops) && trustProxyHops >= 0 ? trustProxyHops : 0);

const authRoutes = require('./routes/authRoutes');

const invoiceRoutes = require('./routes/invoiceRoutes');

const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:5501,http://127.0.0.1:5501')
  .split(',').map(origin => origin.trim()).filter(Boolean);

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'style-src': ["'self'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
      'frame-src': ['https://www.youtube.com', 'https://www.youtube-nocookie.com']
    }
  }
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && origin) {
      try {
        const parsedOrigin = new URL(origin);
        const isLocalHttp = parsedOrigin.protocol === 'http:' &&
          ['localhost', '127.0.0.1', '[::1]', '::1'].includes(parsedOrigin.hostname);
        if (isLocalHttp) return callback(null, true);
      } catch {}
    }
    return callback(new Error('Origen no permitido'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(hpp());
app.use(express.json({ limit: '10kb', strict: true }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

app.get('/', (req, res) => {
  res.json({ message: 'API de Dare-Tech funcionando 🚀' });
});

app.use('/api/facturas', invoiceRoutes);
app.use('/api/invoices', invoiceRoutes); // Alias temporal para compatibilidad con el frontend existente.
app.use('/api/auth', authRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/diagnostics', diagnosticRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Solicitud demasiado grande' });
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ message: 'JSON inválido' });
  }
  if (error.message === 'Origen no permitido') return res.status(403).json({ message: 'Origen no permitido' });
  console.error('Error interno:', error.message);
  return res.status(500).json({ message: 'Error interno del servidor' });
});

module.exports = app;
