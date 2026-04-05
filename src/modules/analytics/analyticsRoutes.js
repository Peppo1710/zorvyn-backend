const express = require('express');
const router = express.Router();
const analyticsController = require('./analyticsController');
const authMiddleware = require('../../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/dashboard', analyticsController.getDashboardStats);
router.post('/insights/generate', analyticsController.getInsights);

module.exports = router;
