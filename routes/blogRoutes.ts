import express from "express";
import * as blogController from "../controllers/blogController.js";
import * as authController from "../controllers/authController.js";

// This is used to create a new router object, Here router === blogRouter
const router = express.Router();

router
  .route("/")
  .get(blogController.getAllBlogs)
  .post(
    authController.protect,
    blogController.setUser,
    blogController.filterCreate,
    blogController.createBlog
  );

router.route("/latest").get(blogController.getLatestBlogs);

router.route("/random").get(blogController.getRandomBlogs);

router.route("/slug/:slug").get(blogController.getBlogBySlug);

router
  .route("/:id")
  // .get(blogController.getBlog)
  .patch(
    authController.protect,
    authController.restrictToSelf("blog"),
    blogController.filterUpdate,
    blogController.updateBlog
  )
  .delete(
    authController.protect,
    authController.restrictToSelf("blog"),
    blogController.deleteBlog
  );
  
router.route("/search").get(blogController.searchBlogs);

// Like a blog
router
  .route("/like/:id")
  .get(blogController.fetchLikes)
  .patch(authController.protect, blogController.likeBlog);

// Note: The following routes are only for admins

// router.use(authController.protect);

// router.use(authController.restrictTo);

// router.route("/admin").get(blogController.getUnReviewedBlogs);

// router.route("admin/:slug").get(blogController.getUnReviewedBlogBySlug);

// router.route("/admin/:id").patch(blogController.reviewBlog);


export default router;
