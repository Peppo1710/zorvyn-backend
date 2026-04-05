const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Security and middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes will be added here
// app.use('/api/auth', authRoutes);
// app.use('/api/records', recordRoutes);

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
