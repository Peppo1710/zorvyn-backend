const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');

const app = express();

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Security and middleware
// CSP is configured to allow Swagger UI assets (scripts, styles, worker blobs)
// while keeping all other Helmet protections (HSTS, X-Frame-Options, etc.) active.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        workerSrc: ["'self'", "blob:"],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(cors());
app.use(express.json());

app.use('/api/auth', authLimiter);
app.use('/api/records', apiLimiter);
app.use('/api/users', apiLimiter);
app.use('/api/audit', apiLimiter);
app.use('/api/analytics', apiLimiter);

const authRoutes = require('./modules/auth/authRoutes');
const recordRoutes = require('./modules/records/recordRoutes');
const analyticsRoutes = require('./modules/analytics/analyticsRoutes');
const usersRoutes = require('./modules/users/usersRoutes');
const auditRoutes = require('./modules/audit/auditRoutes');
const setupSwagger = require('./docs/swagger');

setupSwagger(app);

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Zorvyn Backend is running' });
});

// Centralized error handling
app.use((err, req, res, next) => {
  logger.error(err.stack || err);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
  });
});

module.exports = app;
