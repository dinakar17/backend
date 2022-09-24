import { Request, Response, NextFunction } from "express";
import mongoose, { HydratedDocument } from "mongoose";
import Blog, { IBlog } from "../models/blogModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import filterObj from "../utils/filterObj.js";
import * as factory from "./handleFactory.js";

// setUser function to set the user id to the blog
export const setUser = (req: Request, res: Response, next: NextFunction) => {
  // req.body is the data that is sent in the request body
  // Here, req.body.user = req.user._id is setting the user id to the blog. For example, if the user id is 5f9f9f9f9f9f9f9f9f9f9f9f, then req.body.user = 5f9f9f9f9f9f9f9f9f9f9f9f
  // | Step 8 : set the req.body.user to the user id. Note that we are creating req.body.user here. The "user" is not sent in the request body. We are creating it here.
  // @ts-ignore
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
    "semester",
    "subject",
    "tags",
    "content",
    "user",
    "draft"
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
    const LIMIT = 20;
    const startIndex = (Number(page) - 1) * LIMIT; // get the starting index of every page

    const total = await Blog.countDocuments({ draft: false, reviewed: true }); // get the total number of blogs
    // select only the title, description, featuredImage, slug, createdAt, updatedAt, branch, tags, user from the blog document
    // Here sort({ createdAt: -1 }) is used to sort the blogs in descending order based on the createdAt field i.e., new blogs will be shown first
    // skip(startIndex) is used to skip the blogs that are already shown in the previous pages

    // Note: Do not select blogs whose field "draft" is true and "reviewed" is false

    const blogs = await Blog.find({ draft: false, reviewed: true })
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

export const getLatestBlogs = catchAsync(async (req, res, next) => {
  try {
    const LIMIT = 5;
    const blogs = await Blog.find({ draft: false, reviewed: true })
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .select(
        "title description featuredImage slug createdAt updatedAt branch tags user"
      );
    const currentBlogsCount = blogs.length;

    res.status(200).json({
      data: blogs,
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

export const searchBlogs = catchAsync(async (req, res, next) => {
  console.log(req.query);
  let query = {};
  let sortBy = { createdAt: -1 };

  if (req.query.branch) {
    query = { ...query, branch: req.query.branch };
  }
  if (req.query.semester) {
    query = { ...query, semester: req.query.semester };
  }
  if (req.query.subject) {
    query = { ...query, subject: req.query.subject };
  }
  if (req.query.sort) {
    if (req.query.sort === "latest") {
      sortBy = { ...sortBy, createdAt: -1 };
    } else if (req.query.sort === "oldest") {
      sortBy = { ...sortBy, createdAt: 1 };
    } else if (req.query.sort === "popular") {
      // @ts-ignore
      sortBy = { ...sortBy, likes: -1 };
    }
  }

  if(req.query.search){
    query = { ...query, $text: { $search: req.query.search } };
  }

  let page = req.query.page ? Number(req.query.page) : 1;

  // https://stackoverflow.com/questions/58485932/mongoose-search-multiple-fields
  // https://stackoverflow.com/questions/28775051/best-way-to-perform-a-full-text-search-in-mongodb-and-mongoose
  // https://www.mongodb.com/docs/manual/core/index-text/

  try {
    const LIMIT = 20;
    const startIndex = (Number(page) - 1) * LIMIT;

    // search in text and tags

    const total = await Blog.countDocuments({
      draft: false,
      reviewed: true,
      ...query,
    });

    const blogs = await Blog.find({ draft: false, reviewed: true, ...query })
      // @ts-ignore
      .sort(sortBy)
      .limit(LIMIT)
      .skip(startIndex)
      .select(
        "title description featuredImage slug createdAt updatedAt branch tags user"
      );

    const currentBlogsCount = blogs.length;

    console.log(blogs);

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

// Unable to use createAsync(req, res, next)
export const likeBlog = async (req: Request, res: Response) => {
  // | Step 1: Get the blog id from the request params
  const { id } = req.params;

  // | Step 2: Check if the user is authenticated or not and if not then throw an error
  // @ts-ignore
  if (!req.user) {
    return res.json({ message: "Unauthenticated" });
  }

  // | Step 3: Check if the blog id is valid or not and if not then throw an error
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).send(`No post with id: ${id}`);

  // | Step 4: Get the blog from the database
  const blog = (await Blog.findById(id)) as HydratedDocument<IBlog, IBlog>;

  // | Step 5: Check if the user has already liked the blog or not.
  // Here blog.likes is an array of user ids and req.user.id is the id of the user who is currently logged in
  // @ts-ignore
  const index = blog.likes.findIndex((id) => id === String(req.user._id));

  // | Step 6: If the user has not liked the blog then add the user id to the likes array of the blog
  if (index === -1) {
    // @ts-ignore
    blog.likes.push(req.user);
  } else {
    // | Step 7: If the user has already liked the blog then remove the user id from the likes array of the blog
    // @ts-ignore
    blog.likes = blog.likes.filter((id) => id !== String(req.user._id));
  }

  // | Step 8: Update the blog in the database
  const updatedBlog = await Blog.findByIdAndUpdate(id, blog, { new: true });

  // | Step 9: Send the updated blog as a response
  return res.status(200).json(updatedBlog);
};
