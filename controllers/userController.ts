import User from "../models/userModel.js";
import Blog from "../models/blogModel.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/appError.js";


export const getProfile = catchAsync(async (req, res, next) => {
  // @ts-ignore
  const page = req.query.page * 1 || 1;
  // @ts-ignore
  const user = await User.findById(req.user._id).select("name photo email bio");

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  const LIMIT = 8;

  // @ts-ignore
  const totalBlogs = await Blog.countDocuments({ user: req.user._id });
  // @ts-ignore
  const blogs = await Blog.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .skip((page - 1) * LIMIT)
    .limit(LIMIT)
    .select(
      "title description featuredImage slug createdAt updatedAt branch tags user likes"
    );

  res.status(200).json({
    status: "success",
    data: {
      user,
      blogs,
      totalBlogs,
      blogsCount: blogs.length,
    },
  });
});

export const getEditProfile = catchAsync(async (req, res, next) => {
  // @ts-ignore
  const user = await User.findById(req.user._id).select("name photo email bio");

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

export const updateProfile = catchAsync(async (req, res, next) => {
  // @ts-ignore
  const user = await User.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
    runValidators: true,
  })
  .select(['-password', '-role', '-isVerified']);

  if (!user) {
    return next(new AppError("No user found with that ID", 404));
  }

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

// export const deleteMe = catchAsync(async (req, res, next) => {
//   await User.findByIdAndUpdate(req.user.id, { active: false });

//   res.status(204).json({
//     status: 'success',
//     data: null,
//   });
// });

// export const createUser = (req, res) => {
//   res.status(500).json({
//     status: 'error',
//     message: 'This route is not defined! Please use /signup instead',
//   });
// };

// export const getUser = factory.getOne(User);
// export const getAllUsers = factory.getAll(User);

// // Do NOT update passwords with this!
// export const updateUser = factory.updateOne(User);

// export const deleteUser = catchAsync(async (req, res, next) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const doc = await User.findByIdAndDelete(req.params.id).session(session);
//     if (!doc) {
//       return next(new AppError('No document found with that ID', 404));
//     }

//     await Comment.deleteMany({ user: doc._id }).session(session);
//     await Blog.deleteMany({ user: doc._id }).session(session);

//     await session.commitTransaction();

//     res.status(204).json({
//       status: 'success',
//       data: null,
//     });
//   } catch (err) {
//     await session.abortTransaction();
//     throw err;
//   }
// });
