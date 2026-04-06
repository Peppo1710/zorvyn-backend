const express = require('express');
const router = express.Router();
const recordController = require('./recordController');
const { validate, recordSchema, recordUpdateSchema } = require('../../utils/validator');
const authMiddleware = require('../../middlewares/authMiddleware');
const { allowRoles } = require('../../middlewares/roleMiddleware');

router.use(authMiddleware);

router.get('/', recordController.getRecords);
router.get('/:id', recordController.getRecordById);

router.post('/', allowRoles('analyst', 'admin'), validate(recordSchema), recordController.createRecord);
router.put('/:id', allowRoles('analyst', 'admin'), validate(recordUpdateSchema), recordController.updateRecord);
router.delete('/:id', allowRoles('analyst', 'admin'), recordController.deleteRecord);

module.exports = router;
