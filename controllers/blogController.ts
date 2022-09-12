import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Blog from "../models/blogModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import filterObj from "../utils/filterObj.js";
import * as factory from "./handleFactory.js";

// setUser function to set the user id to the blog
export const setUser = (req: Request, res: Response, next: NextFunction) => {
  // req.body is the data that is sent in the request body
  // Here, req.body.user = req.user._id is setting the user id to the blog. For example, if the user id is 5f9f9f9f9f9f9f9f9f9f9f9f, then req.body.user = 5f9f9f9f9f9f9f9f9f9f9f9f
  // | Step 8 : set the req.body.user to the user id. Note that we are creating req.body.user here. The "user" is not sent in the request body. We are creating it here.
  req.body.user = req.user._id;
  // | Head over to filterCreate function in blogController.ts
  next();
};

export const filterCreate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // filterObj function is used to filter the data that is sent in the request body to ensure that only the allowed fields are sent in the request body
  // | Step 9: filter the data that is sent in the request body to ensure that only the allowed fields are sent in the request body
  req.body = filterObj(
    req.body,
    "title",
    "description",
    "featuredImage",
    "branch",
    "tags",
    "content",
    "user"
  );
  // | Head over to createOne function in handleFactory.ts
  next();
};

export const createBlog = factory.createOne(Blog);

// This is the simple query out of all the queries that we have created. This is used to get a specific blog by its slug
export const getBlogBySlug = catchAsync(async (req, res, next) => {
  // | Step 1: Get the slug from the request params. Here {slug: req.params.slug} is the same as {slug: "hello-world"}.
  let query = Blog.findOne({ slug: req.params.slug });

  // Note: query.populate({path: 'comment'}) is used to populate the comment field in the blog document (Future feature)
  // query = query.populate({
  //   path: 'comment',
  // });
  // | Step 2: Execute the query
  const doc = await query;

  // | Step 3: If the document is not found, then throw an error
  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }

  // | Step 4: Send the response to the client with the document
  // The below response will look like this:
  // { "status": "success", "data": doc }
  res.status(200).json({
    status: "success",
    data: doc,
  });
});

export const filterUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // | Step 11: filter the data that is sent in the request body to ensure that only the allowed fields are sent in the request body
  req.body = filterObj(
    req.body,
    "title",
    "description",
    "featuredImage",
    "content",
    "tags",
    "branch"
  );
  // | Head over to updateBlog function in blogController.ts for the next step
  next();
};

export const updateBlog = factory.updateOne(Blog);
// export const updateBlog = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const { title, description, featuredImage, content, tags, branch } = req.body;

//   if (!mongoose.Types.ObjectId.isValid(id))
//     return res.status(404).send(`No post with id: ${id}`);

//   const doc = {
//     title,
//     description,
//     featuredImage,
//     content,
//     tags,
//     branch,
//     _id: id,
//   } as any;

//   await Blog.findByIdAndUpdate(id, doc, { new: true });
//   return res.status(200).json({ status: "success", data: doc });
// };

export const deleteBlog = factory.deleteOne(Blog);

// This is used to get all the blogs from the database and "Blog" is the model that is used to get the blogs from the database
// export const getAllBlogs = factory.getAll(Blog);
export const getAllBlogs = catchAsync(async (req, res, next) => {
  const { page } = req.query;

  try {
    const LIMIT = 4;
    const startIndex = (Number(page) - 1) * LIMIT; // get the starting index of every page

    const total = await Blog.countDocuments({});
    // select only the title, description, featuredImage, slug, createdAt, updatedAt, branch, tags, user from the blog document
    // Here sort({ createdAt: -1 }) is used to sort the blogs in descending order based on the createdAt field i.e., new blogs will be shown first
    // skip(startIndex) is used to skip the blogs that are already shown in the previous pages
    const blogs = await Blog.find()
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .skip(startIndex)
      .select(
        "title description featuredImage slug createdAt updatedAt branch tags user"
      );
    const currentBlogsCount = blogs.length;

    res.json({
      data: blogs,
      currentPage: Number(page),
      numberOfPages: Math.ceil(total / LIMIT),
      totalBlogs: total,
      currentBlogsCount,
    });
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
});

// export const likePost = async (req: Request, res: Response) => {
//   const { id } = req.params;

//   if (!req.userId) {
//       return res.json({ message: "Unauthenticated" });
//     }

//   if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send(`No post with id: ${id}`);
  
//   const post = await Blog.findById(id);

//   const index = post.likes.findIndex((id) => id ===String(req.userId));

//   if (index === -1) {
//     post.likes.push(req.userId);
//   } else {
//     post.likes = post.likes.filter((id) => id !== String(req.userId));
//   }

//   const updatedPost = await Blog.findByIdAndUpdate(id, post, { new: true });

//   res.status(200).json(updatedPost);
// }
