import { HydratedDocument, Types } from "mongoose";
import { Request, Response, NextFunction } from "express";

import jwt from "jsonwebtoken";

import User, { IUser } from "../models/userModel.js";
import crypto from "crypto";

import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Email from "../utils/email.js";

// * Sign Up
const createSendSignupToken = async (
  user: HydratedDocument<IUser>,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // signupToken = 3b9d6bcdbbfd4b2d9b5dab8dfbbd4bed (crypto.randomBytes(32).toString('hex'))
  // | Step 2: Create a signupToken and save it to the user document
  const signupToken = user.createSignupToken();

  // validateBeforeSave: false is used to prevent the validation of the user document before saving it to the database
  // | Step 3: Save the user document to the database with the signupToken and signupTokenExpires properties
  await user.save({ validateBeforeSave: false });
  // | Step 4: Send the signupToken to the user's email address and a new request is sent (if users clicks) to the endpoint /auth/confirmSignup/:token. Head over to this point to see what happens next
  const signupURL = `${process.env.CLIENT_URL}/auth/confirmSignup/${signupToken}`;

  try {
    await new Email(user, signupURL).sendSignup();

    // | Step 5: If everything goes well send the response to the client
    // Example response: { status: 'success', message: 'Signup token sent to email!' }
    res.status(200).json({
      status: "success",
      message: "Signup Successful",
    });
  } catch (err) {
    // | Step 6: If there is an error, delete the signupToken and signupTokenExpires properties from the user document
    user.signupToken = undefined;
    user.signupTokenExpires = undefined;

    await user.save({ validateBeforeSave: false });

    // | Step 7: Send the error to the client
    // Note: The response in this case is sent by the globalErrorHandler middleware in the errorController.ts file
    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
};

// Note: Take a note of the steps that are followed in the signup function
export const signup = catchAsync(async (req, res, next) => {
  // The create() function is a thin wrapper around the save() function. The above create() call is equivalent to:

  // const doc = new User({ email: 'bill@microsoft.com' });
  // await doc.save(); https://masteringjs.io/tutorials/mongoose/create

  // | Step 1: A new user document is created and saved to the database
  const user: HydratedDocument<IUser> = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  // | see the createSendSignupToken() function for the next steps
  createSendSignupToken(user, req, res, next);
});

export const confirmSignup = catchAsync(async (req, res, next) => {
  // | Step 1: Get the signupToken from the request params and hash it to match the signupToken in the database
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  // let user;

  // user = await User.findOne({
  //   email: req.body.email,
  // });

  // if (user.isVerified)
  //   return next(new AppError('User has already been verified', 400));

  // | Step 2: Find the user document with the hashedToken and a signupTokenExpires property that is greater than the current date
  const user = await User.findOne({
    // email: req.body.email,
    signupToken: hashedToken,
    // here $gt means greater than
    signupTokenExpires: { $gt: Date.now() },
  });

  // | Step 3: If the user document is not found, send the error to the client (this error is handled by the globalErrorHandler middleware in the errorController.ts file)
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  // | Step 4: If the user document is found, set the isVerified property to true and delete the signupToken and signupTokenExpires properties from the user document
  user.isVerified = true;

  user.signupToken = undefined;
  user.signupTokenExpires = undefined;

  // | Step 5: Save the user document to the database
  await user.save({ validateBeforeSave: false });

  // response - { status: 'success', message: 'Verification successful. Please login to continue' }
  // | Step 6: Send the response to the client and now head over to the 'api/v1/auth/login' endpoint to see what happens next
  res.status(200).json({
    status: "success",
    message: "Verification Successful. Please login to continue",
  });
});

// * Sign In 

const signToken = (id: Types.ObjectId) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (
  user: HydratedDocument<IUser>,
  statusCode: number,
  res: Response
) => {
  // | Step 6: Create a JWT token and send it to the client
  const token = signToken(user._id);
  const expire_time: number = parseInt(
    process.env.JWT_COOKIE_EXPIRES_IN as string
  );
  const cookieOptions = {
    // expires in 30*24*60*60*1000 milliseconds = 30 days
    expires: new Date(Date.now() + expire_time * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: false,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  // | Step 7: Send the JWT token to the client in a cookie through res.cookie()
  res.cookie("jwt", token, cookieOptions);

  // | Step 8: Set user.password = undefined; the reason for this is that we don't want to send the password to the client side.
  // Don't worry, the password is still stored in the database because we haven't saved the user document yet
  user.password = undefined as any;
  user.role = undefined as any;
  user.isVerified = undefined as any;

  // This is the response that is sent to the client after the user logs in
  // response - { status: 'success', token, data: { user: { _id: '5f9e9b9b9b9b9b9b9b9b9b9b', name: 'John Doe', email: 'john@gmail.com', role: undefined, isVerified: undefined } } }
  // | Step 9: Send the response to the client. Optional: Head over to Reset password or forgot password to know more 
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

export const login = catchAsync(async (req, res, next) => {
  // | Step 1: Get the email and password from the request body
  const { email, password } = req.body;

  // | Step 2: Check if the email and password exist in the request body and if they don't send the error to the client (this error is handled by the globalErrorHandler middleware in the errorController.ts file)
  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }
  // select('+password') is used to select the password field in the query result (by default it is not selected)
  // | Step 3: Find the user document with the email and password
  const user = await User.findOne({ email }).select("+password");

  // | Step 4: If the user is not found or the password is incorrect, send the error to the client (this error is handled by the globalErrorHandler middleware in the errorController.ts file)
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  //if user tries to login without verification allow user to resend the verification token
  // | Step 5: if the user is not verified, send the error the client i.e., response - { status: 'error', message: 'Please verify your email address' }
  if (!user.isVerified)
    return next(
      new AppError(
        "Your account has not been verified. Please verify account to login",
        401
      )
    );

  // | See the createSendToken() function for the next steps
  createSendToken(user, 200, res);
});

// * Forgot Password
export const forgotPassword = catchAsync(async (req, res, next) => {
  // | Step 1: Get the email from the request body
  const user = await User.findOne({ email: req.body.email });
  // | Step 2: If the user is not found, send the error to the client (this error is handled by the globalErrorHandler middleware in the errorController.ts file)
  if (!user) {
    return next(new AppError('There is no user with this email address.', 404));
  }

  // | Step 3: If the user is found and is not verified, send the error to the client
  if (!user.isVerified) {
    return next(
      new AppError(
        'Your account is not verified. Please verify account to continue.',
        401
      )
    );
  }
  // | Step 4: If the user is found and is verified, generate a random reset token and save it to the user document (passwordResetToken) and set the passwordResetExpires property to 10 minutes from now
  const resetToken = user.createPasswordResetToken();

  // | Step 5: Save the user document to the database
  await user.save({ validateBeforeSave: false });

  // | Step 6: Send the reset token to the user's email address and when user clicks on the link, the user will be redirected to the reset password page
  // Now head over to ${BASE_URL}/reset-password/${resetToken} on the client side or /api/v1/auth/reset-password/${resetToken} on the server side to see what happens next
  const resetURL = `${process.env.CLIENT_URL}/auth/resetPassword/${resetToken}`;

  try {
    await new Email(user, resetURL).sendPasswordReset();

  // response - { status: 'success', message: 'Token sent to email!' }
  // | Step 7: Send the response to the client
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
  // | Step 8: If there is an error while sending the email, set the passwordResetToken and passwordResetExpires properties to undefined and save the user document to the database
    user.passwordResetToken = undefined as any;
    user.passwordResetExpires = undefined as any;

    await user.save({ validateBeforeSave: false });

  // | Step 9: Send the error to the client (this error is handled by the globalErrorHandler middleware in the errorController.ts file)
    return next(
      new AppError('There was an error sending the email. Try again later!', 500),
    );
  }
});

// * Reset Password 
export const resetPassword = catchAsync(async (req, res, next) => {
  // | Step 1: Get the token from the request params and create a hashed token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // | Step 2: Find the user document with the hashed token and check if the passwordResetExpires property is greater than the current time
  const user = await User.findOne({
    // email: req.body.email,
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // | Step 3: If the user is not found or the passwordResetExpires property is less than the current time, send the error to the client 
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // | Step 4: If the user is found and the passwordResetExpires property is greater than the current time, 
  // | set the new password and save the user document to the database
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined as any;
  user.passwordResetExpires = undefined as any;

  await user.save();

  // | Step 5: Send the response to the client
  // createSendToken(user, 200, res);
  // response - { status: 'success', message: 'Password reset successfully!' }
  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully. Please login to continue',
  });
});


// Create a machine learning model to convert code snippets to explanatory text
