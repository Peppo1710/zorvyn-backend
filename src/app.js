const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Security and middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

const authRoutes = require('./modules/auth/authRoutes');
const recordRoutes = require('./modules/records/recordRoutes');
const analyticsRoutes = require('./modules/analytics/analyticsRoutes');
const setupSwagger = require('./docs/swagger');

// Setup Swagger UI
setupSwagger(app);

// Routes will be added here
app.use('/api/auth', authRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Zorvyn Backend is running' });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'Something went wrong',
  });
});

module.exports = app;
