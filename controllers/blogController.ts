import { Request, Response, NextFunction } from "express";
import { IUser } from "models/userModel.js";
import mongoose, { HydratedDocument } from "mongoose";
import Blog, { IBlog } from "../models/blogModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import filterObj from "../utils/filterObj.js";
import * as factory from "./handleFactory.js";

export const setUser = (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  req.body.user = req.user._id;
  next();
};

export const filterCreate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body.tags) {
    req.body.tagsString = req.body.tags.join(", ").toLowerCase();
  }
  req.body = filterObj(
    req.body,
    "title",
    "description",
    "featuredImage",
    "branch",
    "semester",
    "subject",
    "tags",
    "tagsString",
    "content",
    "user",
    "draft",
    "anonymous"
  );
  next();
};

export const createBlog = factory.createOne(Blog);

export const getBlogBySlug = catchAsync(async (req, res, next) => {
  let query = Blog.findOne({ slug: req.params.slug });

  const doc = await query;

  if (!doc) {
    return next(new AppError("No document found with that ID", 404));
  }
  let relatedBlogs;

  relatedBlogs = await Blog.find({
    draft: false,
    reviewed: true,
    $and: [{ branch: doc.branch }, { _id: { $ne: doc._id } }],
  })
    .limit(5)
    .select("title slug user createdAt featuredImage anonymous");

  if (relatedBlogs.length === 0) {
    relatedBlogs = await Blog.aggregate([
      { $match: { draft: false, reviewed: true } },
      { $sample: { size: 5 } },
      {
        $lookup: {
          from: "users",
          localField: "user",
          // foreignField is used to specify the field in the users collection that we want to match with the localField
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $project: {
          title: 1,
          slug: 1,
          createdAt: 1,
          "user.name": 1,
          featuredImage: 1,
          anonymous: 1,
        },
      },
    ]);
  }

  res.status(200).json({
    status: "success",
    data: doc,
    relatedBlogs,
  });
});

export const filterUpdate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.body.tags) {
    req.body.tagsString = req.body.tags.join(", ").toLowerCase();
  }
  req.body = filterObj(
    req.body,
    "title",
    "description",
    "featuredImage",
    "branch",
    "semester",
    "subject",
    "tags",
    "tagsString",
    "content",
    "draft",
    "anonymous"
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

export const getAllBlogs = catchAsync(async (req, res, next) => {
  const { page } = req.query;

  try {
    const LIMIT = 16;
    const startIndex = (Number(page) - 1) * LIMIT; // get the starting index of every page

    const total = await Blog.countDocuments({ draft: false, reviewed: true }); // get the total number of blogslk;'

    const blogs = await Blog.find({ draft: false, reviewed: true })
      .sort({ createdAt: -1 })
      .limit(LIMIT)
      .skip(startIndex)
      .select(
        "title description featuredImage slug createdAt updatedAt tags user likes anonymous"
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
    const LIMIT = 7;
    const blogs = await Blog.find({ draft: false, reviewed: true })
      .sort({ createdAt: -1 })
      // Note: If there are less than 10 blogs, limit function will not be executed and all the blogs will be returned
      .limit(LIMIT)
      .select(
        "title description featuredImage slug createdAt updatedAt tags user likes anonymous"
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

export const searchBlogs = catchAsync(async (req, res, next) => {
  let query = {};
  let sortBy = { createdAt: -1 };
  if (req.query.branch) {
    query = { ...query, "branch.value": req.query.branch };
  }
  if (req.query.semester) {
    query = { ...query, "semester.value": req.query.semester };
  }
  if (req.query.subject) {
    query = { ...query, "subject.value": req.query.subject };
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

  if (req.query.search) {
    query = { ...query, $text: { $search: req.query.search } };
  }
  let page = req.query.page ? Number(req.query.page) : 1;

  try {
    const LIMIT = 16;
    const startIndex = (Number(page) - 1) * LIMIT;

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
        "title description featuredImage slug createdAt updatedAt branch tags user likes"
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

export const fetchLikes = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id))
    return next(new AppError("No blog with that id", 404));

  const blog = await Blog.findById(id);

  res.status(200).json({
    status: "success",
    // @ts-ignore
    likes: blog.likes,
  });
});

export const likeBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // @ts-ignore 
  if (!req.user) {
    return next(
      new AppError("You are not logged in. Please login to like", 401)
    );
  }

  if (!mongoose.Types.ObjectId.isValid(id))
    return next(new AppError("No blog with that id", 404));

  const blog = (await Blog.findById(id)) as HydratedDocument<IBlog, IBlog>;

  // @ts-ignore
  const index = blog.likes.findIndex((id) => id === String(req.user._id));

  if (index === -1) {
    // @ts-ignore
    blog.likes.push(req.user._id);
  } else {
    // @ts-ignore
    blog.likes = blog.likes.filter((id) => id !== String(req.user._id));
  }

  await Blog.findByIdAndUpdate(id, blog, { new: true });

  res.status(200).json({
    status: "success",
    likes: blog.likes,
  });
});

export const getRandomBlogs = catchAsync(async (req, res, next) => {
  const blogs = await Blog.aggregate([
    { $match: { draft: false, reviewed: true } },
    { $sample: { size: 4 } },
    {

      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $project: {
        title: 1,
        featuredImage: 1,
        slug: 1,
        "user.name": 1,
        "user.photo": 1,
        anonymous: 1,
      },
    },
  ]);

  res.status(200).json({
    status: "success",
    data: blogs,
  });
});

// ---------------- ADMIN ---------------- //

export const getUnReviewedBlogs = catchAsync(async (req, res, next) => {
  const page = req.query.page || 1;
  // @ts-ignore
  const user = req.user as HydratedDocument<IUser, IUser>;

  const LIMIT = 20;

  let query;

  if (user.role.adminBranch === "all") {
    query = {
      draft: false,
      reviewed: false,
    };
  } else {
    query = {
      draft: false,
      reviewed: false,
      "branch.value": user.role.adminBranch,
      "semester.value": user.role.adminSemester,
    };
  }

  const totalUnReviewedBlogs = await Blog.countDocuments({
    draft: false,
    reviewed: false,
  });

  const unReviewedBlogs = await Blog.find({
    draft: false,
    reviewed: false,
  })
    .sort({ createdAt: -1 })
    .limit(LIMIT)
    .skip((Number(page) - 1) * LIMIT)
    .select("title description featuredImage slug user tags createdAt");


  res.status(200).json({
    status: "success",
    data: unReviewedBlogs,
    currentPage: Number(page),
    numberOfPages: Math.ceil(totalUnReviewedBlogs / LIMIT),
  });
});

export const getUnReviewedBlogBySlug = catchAsync(async (req, res, next) => {
  const { slug } = req.params;

  const blog = await Blog.findOne({ slug, draft: false, reviewed: false });

  if (!blog) {
    return next(
      new AppError(
        "Either the blog does not exist or it has been reviewed",
        404
      )
    );
  }

  res.status(200).json({
    status: "success",
    data: blog,
  });
});

export const reviewBlog = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id))
    return next(new AppError("No blog with that id", 404));

  const blog = await Blog.findByIdAndUpdate(
    id,
    { reviewed: true },
    { new: true }
  );

  res.status(200).json({
    status: "success",
    data: blog,
  });
});

