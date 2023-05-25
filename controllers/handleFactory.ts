import mongoose from "mongoose";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

export const createOne = (Model: mongoose.Model<any, {}>) =>
  catchAsync(async (req, res, next) => {

    const doc = await Model.create(req.body);

    res.status(201).json({
      status: "success",
      data: doc,  
    });
  });

export const updateOne = (Model: mongoose.Model<any, {}>) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }

    res.status(200).json({
      status: "success",
      data: doc,
    });
  });

export const deleteOne = (Model: mongoose.Model<any, {}>) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    res.status(201).json({
      status: "success",
      data: null,
    });
  });
