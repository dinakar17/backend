import express from 'express';
import * as authController from '../controllers/authController.js';
const router = express.Router();
router.post('/signup', authController.signup);
router.post('/resendSignupToken', authController.resendSignupToken);
router.post('/confirmSignup/:token', authController.confirmSignup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
// This middleware gets executed after the above routes are executed and failed to return a response
router.use(authController.protect);
// router.patch('/updateMyPassword', authController.updatePassword);
// router.patch(
//   '/updateMe',
//   multerUpload,
//   userController.uploadUserPhoto,
//   userController.updateMe
// );
// //to let user delete their account. doesn't really deletes the account but only deactivates it
// router.delete('/deleteMe', userController.deleteMe);
// //For the user to get their complete info
// router.get('/me', userController.getMe);
// //Restrict all the routes below this middleware to admin only
// router.use(authController.restrictTo('admin'));
// router
//   .route('/')
//   .get(userController.getAllUsers)
//   .post(userController.createUser);
// router
//   .route('/:id')
//   .get(userController.getUser)
//   .patch(userController.updateUser)
//   .delete(userController.deleteUser);
export default router;
