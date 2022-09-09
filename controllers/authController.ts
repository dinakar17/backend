import { HydratedDocument } from "mongoose";
import { Request, Response, NextFunction } from "express";

import User, { IUser } from "../models/userModel.js";

import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";
import Email from "../utils/email.js";

const createSendSignupToken = async (user: HydratedDocument<IUser>, req: Request, res: Response, next: NextFunction) => {
  const signupToken = user.createSignupToken();

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
