import express from 'express';

import * as authController from '../controllers/authController.js';

const router = express.Router();

router.post('/signup', authController.signup);

router.post('/confirmSignup/:token', authController.confirmSignup);

router.post('/login', authController.login);

router.post('/forgotPassword', authController.forgotPassword)

router.patch('/resetPassword/:token', authController.resetPassword);

export default router;