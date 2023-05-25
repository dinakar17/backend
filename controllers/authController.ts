import mongoose, { HydratedDocument, Types } from "mongoose";
import { Request, Response, NextFunction } from "express";
export interface IGetUserAuthInfoRequest extends Request {
  user: string; // or any other type
}

import jwt from "jsonwebtoken";

import User, { IUser } from "../models/userModel.js";
import Blog from "../models/blogModel.js";

import crypto from "crypto";

import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Email from "../utils/email.js";

import { promisify } from "util";

// * Sign Up
const createSendSignupToken = async (
  user: HydratedDocument<IUser>,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const signupToken = user.createSignupToken();

  await user.save({ validateBeforeSave: false });
  const signupURL = `${process.env.CLIENT_URL}/auth/confirmSignup/${signupToken}`;
  try {
    let email = new Email(user, signupURL);
    await email.sendSignup();

    res.status(200).json({
      status: "success",
      message: "Signup token sent to the email!",
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
  const oldUser = await User.findOne({ email: req.body.email });

  if (oldUser) {
    return next(new AppError("User already exists!", 400));
  }

  const user: HydratedDocument<IUser> = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  createSendSignupToken(user, req, res, next);
});

// * Resend Signup Token
export const resendSignupToken = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with this email address.", 404));
  }

  if (user.isVerified) {
    return next(
      new AppError(
        "Your account is already verified. Please login to continue",
        400
      )
    );
  }

  createSendSignupToken(user, req, res, next);
});

// * Confirm Signup
export const confirmSignup = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    // email: req.body.email,
    signupToken: hashedToken,
    signupTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new AppError(
        "Your token has either expired or is invalid! Please signup again.",
        400
      )
    );
  }

  user.isVerified = true;

  user.signupToken = undefined;
  user.signupTokenExpires = undefined;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message:
      "Your account has been successfully created! Please login to continue",
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
  const token = signToken(user._id);
  const expire_time: number = parseInt(
    process.env.JWT_COOKIE_EXPIRES_IN as string
  );
  const cookieOptions = {
    expires: new Date(Date.now() + expire_time * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: false,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  user.password = undefined as any;
  user.role = undefined as any;
  user.isVerified = undefined as any;

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
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(
      new AppError("User doesn't exist. Please signup to continue", 400)
    );
  }

  if (!(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect password", 401));
  }

  if (!user.isVerified)
    // Todo: Deal with this later
    return next(
      new AppError(
        "Your account has not been verified. Please verify account to login",
        401
      )
    );

  createSendToken(user, 200, res);
});

// * Forgot Password
export const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with this email address.", 404));
  }

  if (!user.isVerified) {
    return next(
      new AppError(
        "Your account is not verified. Please verify account to continue.",
        401
      )
    );
  }
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.CLIENT_URL}/auth/resetPassword/${resetToken}`;

  try {
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Password reset token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined as any;
    user.passwordResetExpires = undefined as any;

    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
});

// * Reset Password
export const resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");


  const user = await User.findOne({
    // email: req.body.email,
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined as any;
  user.passwordResetExpires = undefined as any;

  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password changed successfully. Please login to continue",
  });
});

// ------------ Blog Post Auth Controller ------------ //
export const protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }
  // @ts-ignore
  req.user = currentUser;

  next();
});

// // Type of ...roles is an array of strings
// export const restrictTo =
//   (...roles: string[]) =>
//   (req: Request, res: Response, next: NextFunction) => {
//     // if (!roles.includes(req.user.role)) { 
//       return next(
//         new AppError('You do not have permission to perform this action', 403) //403 for unauthorized access
//       );
//     }

//     next();
//   };

export const restrictTo = catchAsync(async (req, res, next) => {
  // @ts-ignore
  if(!req.user.role.isAdmin){
    return next(
      new AppError('You do not have permission to perform this action', 403) //403 for unauthorized access
    );
  }
  next();
});

//TODO - allow admins - by taking argument
// restricToSelf - only allow the user to update his own data
export const restrictToSelf = (model: string) =>
  catchAsync(async (req, res, next) => {
    let Model: mongoose.Model<any, {}> = Blog;
    if (model === "blog") Model = Blog;

    const doc = await Model.findById(req.params.id);

    // @ts-ignore
    if (!doc.user._id.equals(req.user._id)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  });