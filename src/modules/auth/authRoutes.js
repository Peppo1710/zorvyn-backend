const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { validate, registerSchema, loginSchema } = require('../../utils/validator');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);

module.exports = router;
