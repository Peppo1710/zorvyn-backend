const express = require('express');
const router = express.Router();
const recordController = require('./recordController');
const { validate, recordSchema } = require('../../utils/validator');
const authMiddleware = require('../../middlewares/authMiddleware');

router.use(authMiddleware);

router.post('/', validate(recordSchema), recordController.createRecord);
router.get('/', recordController.getRecords);
router.get('/:id', recordController.getRecordById);
router.put('/:id', recordController.updateRecord);
router.delete('/:id', recordController.deleteRecord);

module.exports = router;
