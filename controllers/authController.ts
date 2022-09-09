import { HydratedDocument, Types} from "mongoose";
import { Request, Response, NextFunction } from "express";


import jwt from 'jsonwebtoken';

import User, { IUser } from "../models/userModel.js";
import crypto from "crypto";

import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Email from "../utils/email.js";

const createSendSignupToken = async (
  user: HydratedDocument<IUser>,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // signupToken = 3b9d6bcdbbfd4b2d9b5dab8dfbbd4bed (crypto.randomBytes(32).toString('hex'))
  const signupToken = user.createSignupToken();

  // validateBeforeSave: false is used to prevent the validation of the user document before saving it to the database
  await user.save({ validateBeforeSave: false });

  const signupURL = `${process.env.CLIENT_URL}/auth/confirmSignup/${signupToken}`;

  try {
    await new Email(user, signupURL).sendSignup();

    res.status(200).json({
      status: "success",
      message: "Signup Successful",
    });
  } catch (err) {
    user.signupToken = undefined;
    user.signupTokenExpires = undefined;

    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
};

export const signup = catchAsync(async (req, res, next) => {
  // The create() function is a thin wrapper around the save() function. The above create() call is equivalent to:

  // const doc = new User({ email: 'bill@microsoft.com' });
  // await doc.save(); https://masteringjs.io/tutorials/mongoose/create

  const user: HydratedDocument<IUser> = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createSendSignupToken(user, req, res, next);
});

export const confirmSignup = catchAsync(async (req, res, next) => {
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

  // find the user with the signupToken and signupTokenExpires properties
  const user = await User.findOne({
    // email: req.body.email,
    signupToken: hashedToken,
    // here $gt means greater than
    signupTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.isVerified = true;

  user.signupToken = undefined;
  user.signupTokenExpires = undefined;

  await user.save({ validateBeforeSave: false });

  // response - { status: 'success', message: 'Signup Successful' }
  res.status(200).json({
    status: "success",
    message: "Verification Successful. Please login to continue",
  });
});

const signToken = (id: Types.ObjectId) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (
  user: HydratedDocument<IUser>,
  statusCode: number,
  res: Response
) => {
  const token = signToken(user._id);
  const expire_time: number = parseInt(process.env.JWT_COOKIE_EXPIRES_IN as string);
  const cookieOptions = {
    expires: new Date(
      Date.now() + expire_time * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: false,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // user.password = undefined; the reason for this is that we don't want to send the password to the client side. 
  // Don't worry, the password is still stored in the database because we haven't saved the user document yet
  user.password = undefined as any;
  user.role = undefined as any;
  user.isVerified = undefined as any;

  // This is the response that is sent to the client after the user logs in
  // response - { status: 'success', token, data: { user: { _id: '5f9e9b9b9b9b9b9b9b9b9b9b', name: 'John Doe', email: 'john@gmail.com', role: 'user', isVerified: true } } }
  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }
  // select('+password') is used to select the password field in the query result (by default it is not selected)
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  //if user tries to login without verification allow user to resend the verification token
  if (!user.isVerified)
    return next(
      new AppError(
        "Your account has not been verified. Please verify account to login",
        401
      )
    );
  
  // if all is well, send token to client
  createSendToken(user, 200, res);
});

// Create a machine learning model to convert code snippets to explanatory text
