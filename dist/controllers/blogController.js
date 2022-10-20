import mongoose from "mongoose";
import Blog from "../models/blogModel.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import filterObj from "../utils/filterObj.js";
import * as factory from "./handleFactory.js";
// setUser function to set the user id to the blog
export const setUser = (req, res, next) => {
    // req.body is the data that is sent in the request body
    // Here, req.body.user = req.user._id is setting the user id to the blog. For example, if the user id is 5f9f9f9f9f9f9f9f9f9f9f9f, then req.body.user = 5f9f9f9f9f9f9f9f9f9f9f9f
    // | Step 8 : set the req.body.user to the user id. Note that we are creating req.body.user here. The "user" is not sent in the request body. We are creating it here.
    // @ts-ignore
    req.body.user = req.user._id;
    // | Head over to filterCreate function in blogController.ts
    next();
};
export const filterCreate = (req, res, next) => {
    if (req.body.tags) {
        req.body.tagsString = req.body.tags.join(", ").toLowerCase();
    }
    // filterObj function is used to filter the data that is sent in the request body to ensure that only the allowed fields are sent in the request body
    // | Step 9: filter the data that is sent in the request body to ensure that only the allowed fields are sent in the request body
    req.body = filterObj(req.body, "title", "description", "featuredImage", "branch", "semester", "subject", "tags", "tagsString", "content", "user", "draft", "anonymous");
    // | Head over to createOne function in handleFactory.ts
    next();
};
export const createBlog = factory.createOne(Blog);
// This is the simple query out of all the queries that we have created. This is used to get a specific blog by its slug
export const getBlogBySlug = catchAsync(async (req, res, next) => {
    // | Step 1: Get the slug from the request params. Here {slug: req.params.slug} is the same as {slug: "hello-world"}.
    // Todo: Fetch the blog only if it is reviewed
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
    let relatedBlogs;
    // | Step 4: Get relevant blogs based on the current blog's branch
    relatedBlogs = await Blog.find({
        draft: false,
        reviewed: true,
        $and: [{ branch: doc.branch }, { _id: { $ne: doc._id } }],
    })
        .limit(5)
        .select("title slug user createdAt featuredImage anonymous");
    // if no relevant blogs are found, then get random blogs which are reviewed and not draft
    // | Step 5: If no relevant blogs are found, then get random blogs which are reviewed and not draft
    if (relatedBlogs.length === 0) {
        relatedBlogs = await Blog.aggregate([
            { $match: { draft: false, reviewed: true } },
            { $sample: { size: 5 } },
            {
                // only look up the user with the user id matching the user field in the blogs collection
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
    // | Step 6: Send the response to the client with the document
    // The below response will look like this:
    // { "status": "success", "data": doc }
    res.status(200).json({
        status: "success",
        data: doc,
        relatedBlogs,
    });
});
export const filterUpdate = (req, res, next) => {
    if (req.body.tags) {
        req.body.tagsString = req.body.tags.join(", ").toLowerCase();
    }
    // | Step 11: filter the data that is sent in the request body to ensure that only the allowed fields are sent in the request body
    req.body = filterObj(req.body, "title", "description", "featuredImage", "branch", "semester", "subject", "tags", "tagsString", "content", "draft", "anonymous");
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
        const LIMIT = 16;
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
            .select("title description featuredImage slug createdAt updatedAt branch tags user likes anonymous");
        const currentBlogsCount = blogs.length;
        res.json({
            data: blogs,
            currentPage: Number(page),
            numberOfPages: Math.ceil(total / LIMIT),
            totalBlogs: total,
            currentBlogsCount,
        });
    }
    catch (error) {
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
            .select("title description featuredImage slug createdAt updatedAt branch tags user likes anonymous");
        const currentBlogsCount = blogs.length;
        res.status(200).json({
            data: blogs,
            currentBlogsCount,
        });
    }
    catch (error) {
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
    // https://stackoverflow.com/questions/39018389/mongodb-find-key-on-nested-object-key-json
    let query = {};
    let sortBy = { createdAt: -1 };
    // https://www.mongodb.com/community/forums/t/search-on-a-string-array-content/16798
    // https://www.mongodb.com/docs/manual/tutorial/query-arrays/
    // https://stackoverflow.com/questions/21417711/search-multiple-fields-for-multiple-values-in-mongodb
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
        }
        else if (req.query.sort === "oldest") {
            sortBy = { ...sortBy, createdAt: 1 };
        }
        else if (req.query.sort === "popular") {
            // @ts-ignore
            sortBy = { ...sortBy, likes: -1 };
        }
    }
    if (req.query.search) {
        query = { ...query, $text: { $search: req.query.search } };
    }
    let page = req.query.page ? Number(req.query.page) : 1;
    // https://stackoverflow.com/questions/58485932/mongoose-search-multiple-fields
    // https://stackoverflow.com/questions/28775051/best-way-to-perform-a-full-text-search-in-mongodb-and-mongoose
    // https://www.mongodb.com/docs/manual/core/index-text/
    try {
        const LIMIT = 16;
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
            .select("title description featuredImage slug createdAt updatedAt branch tags user likes");
        // const blogs = await Blog.aggregate([
        //   { $match: { draft: false, reviewed: true, ...query } },
        //   {
        //     $project: {
        //       title: 1,
        //       description: 1,
        //       featuredImage: 1,
        //       tags: 1,
        //       slug: 1,
        //       createdAt: 1,
        //       updatedAt: 1,
        //     },
        //   },
        //   {
        //     $sort: sortBy,
        //   },
        // ]);
        const currentBlogsCount = blogs.length;
        res.json({
            data: blogs,
            currentPage: Number(page),
            numberOfPages: Math.ceil(total / LIMIT),
            totalBlogs: total,
            currentBlogsCount,
        });
    }
    catch (error) {
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
// Unable to use createAsync(req, res, next)
export const likeBlog = catchAsync(async (req, res, next) => {
    // | Step 1: Get the blog id from the request params
    const { id } = req.params;
    // | Step 2: Check if the user is authenticated or not and if not then throw an error
    // @ts-ignore No need to check if the user is authenticated or not since the middleware will do it for us
    if (!req.user) {
        return next(new AppError("You are not logged in. Please login to like", 401));
    }
    // | Step 3: Check if the blog id is valid or not and if not then throw an error
    if (!mongoose.Types.ObjectId.isValid(id))
        return next(new AppError("No blog with that id", 404));
    // | Step 4: Get the blog from the database
    const blog = (await Blog.findById(id));
    // | Step 5: Check if the user has already liked the blog or not.
    // Here blog.likes is an array of user ids and req.user.id is the id of the user who is currently logged in
    // @ts-ignore
    const index = blog.likes.findIndex((id) => id === String(req.user._id));
    // | Step 6: If the user has not liked the blog then add the user id to the likes array of the blog
    if (index === -1) {
        // @ts-ignore
        blog.likes.push(req.user._id);
    }
    else {
        // | Step 7: If the user has already liked the blog then remove the user id from the likes array of the blog
        // @ts-ignore
        blog.likes = blog.likes.filter((id) => id !== String(req.user._id));
    }
    // | Step 8: Update the blog in the database
    await Blog.findByIdAndUpdate(id, blog, { new: true });
    // | Step 9: Send the updated blog as a response
    res.status(200).json({
        status: "success",
        likes: blog.likes,
    });
});
export const getRandomBlogs = catchAsync(async (req, res, next) => {
    // pick 4 random blogs and select title, featuredImage, user, slug and add "photo", "name" from the users collection to the user field in blogs collection
    const blogs = await Blog.aggregate([
        { $match: { draft: false, reviewed: true } },
        { $sample: { size: 4 } },
        {
            // only look up the user with the user id matching the user field in the blogs collection
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
    const user = req.user;
    const LIMIT = 20;
    let query;
    if (user.role.adminBranch === "all") {
        query = {
            draft: false,
            reviewed: false,
        };
    }
    else {
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
        return next(new AppError("Either the blog does not exist or it has been reviewed", 404));
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
    const blog = await Blog.findByIdAndUpdate(id, { reviewed: true }, { new: true });
    res.status(200).json({
        status: "success",
        data: blog,
    });
});
/*
Mongosh Query to add role field to all the users
db.users.updateMany({}, {$set: {role: {adminBranch: "all", adminSemester: "all", isAdmin: true}}})


*/
