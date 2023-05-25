import express from "express";

import * as authController from "../controllers/authController.js";
import * as userController from "../controllers/userController.js";

const router = express.Router();

router.post("/signup", authController.signup);

router.post("/resendSignupToken", authController.resendSignupToken);

router.post("/confirmSignup/:token", authController.confirmSignup);

router.post("/login", authController.login);

router.post("/forgotPassword", authController.forgotPassword);

router.patch("/resetPassword/:token", authController.resetPassword);

router.use(authController.protect);

router
  .route("/profile")
  .get(userController.getProfile)

router.route("/editProfile")
.get(userController.getEditProfile)
.patch(userController.updateProfile);

// router.patch('/updateMyPassword', authController.updatePassword);

// router.patch(
//   '/updateMe',
//   multerUpload,
//   userController.uploadUserPhoto,
//   userController.updateMe
// );

// router.delete('/deleteMe', userController.deleteMe);

router.use(authController.restrictTo);

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
