import express from 'express';

import * as authController from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', authController.signup);

router.post('/confirmSignup/:token', authController.confirmSignup);

router.post('/login', authController.login);

export default router;