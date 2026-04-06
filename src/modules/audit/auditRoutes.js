const express = require('express');
const router = express.Router();
const auditController = require('./auditController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { allowRoles } = require('../../middlewares/roleMiddleware');

router.use(authMiddleware);
router.use(allowRoles('admin'));

router.get('/logs', auditController.listAuditLogs);

module.exports = router;
