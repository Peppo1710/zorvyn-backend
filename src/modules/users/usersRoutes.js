const express = require('express');
const router = express.Router();
const usersController = require('./usersController');
const authMiddleware = require('../../middlewares/authMiddleware');
const { allowRoles } = require('../../middlewares/roleMiddleware');

router.use(authMiddleware);

router.get('/me', usersController.getMe);
router.get('/', allowRoles('admin'), usersController.listUsers);
router.get('/:id', usersController.getUserById);
router.patch('/:id', allowRoles('admin'), usersController.updateUser);

module.exports = router;
