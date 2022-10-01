import mongoose from "mongoose";
import slugify from "slugify";

export type IBlog = mongoose.Document & {
  title: string;
  description: string;
  slug: string;
  featuredImage: string;
  branch: string;
  semester: string;
  subject: string;
  tags: string[];
  likes: string[];
  content: string;
  user: mongoose.Schema.Types.ObjectId;
  createdAt: string;
  updatedAt: string;
  draft: boolean;
  reviewed: boolean;
};
const blogSchema = new mongoose.Schema<IBlog>(
  {
    title: {
      type: String,
      required: [true, "Must have title"],
      unique: true,
    },
    description: { type: String, default: "" },
    featuredImage: { type: String, default: "" },
    // https://mongoosejs.com/docs/schematypes.html
    branch: {
      value: { type: String, default: "" },
      label: { type: String, default: "" },
    },
    semester: {
      value: { type: String, default: "" },
      label: { type: String, default: "" },
    },
    subject: {
      value: { type: String, default: "" },
      label: { type: String, default: "" },
    },
    tags: { type: [String], default: [] },
    slug: String,
    // blogData: {
    //   // Here time is the time when the blog was created. This is used to sort the blogs by time
    //   time: {
    //     type: Date,
    //     required: [true, 'Must have time!'],
    //     default: Date.now(),
    //   },
    //   // Here version is the version of the blog. This is used to sort the blogs by version
    //   version: {
    //     type: String,
    //     required: [true, 'Must have version!'],
    //     default: '1.0.0',
    //   },
    //   // Here content is the content of the blog. This is the main content of the blog
    //   content: {
    //     type: String,
    //     required: [true, 'Must have content!'],
    //   },
    // },
    content: {
      type: String,
      required: [true, "Must have content!"],
    },
    likes: {
      type: [String],
      default: [],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Must have user!"],
    },
    draft: {
      type: Boolean,
      default: false,
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
  },
  // timestamps, toJSON, and toObject are used to add createdAt and updatedAt fields to the schema
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// blogSchema.index({name: "text", "title": "text"}) means that we can search for blogs by title.
blogSchema.index({ name: "text", title: "text" });

// blogSchema.virtual('comment', {}) is used to add a virtual field to the schema (Future feature)
// blogSchema.virtual('comment', {
//   ref: 'Comment',
//   foreignField: 'blog',
//   localField: '_id',
//   match: { isReply: false },
//   options: { sort: { createdAt: -1 } },
// });

// blogSchema.pre('save', {}) is used to run a function before the document is saved to the database
// Here the slug is created from the title
blogSchema.pre("save", function (next) {
  this.slug = slugify(this.title, { lower: true });
  next();
});

// blogSchema.pre(/^find/, {}) is used to run a function before the query is executed
// Here the populate function is used to populate the user field with the user data
blogSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name photo",
  });
  next();
});

// fetch user name and photo from the user model when aggregating
// blogSchema.pre("aggregate", function (next) {
//   this.pipeline().unshift({
//     $lookup: {
//       from: "users",
//       localField: "user",
//       foreignField: "_id",
//       as: "user",
//     },
//   });

//   this.pipeline().unshift({
//     $unwind: "$user",
//   });
// });

// mongoose.model("Blog", blogSchema) is used to create a new model called Blog
const Blog = mongoose.model<IBlog>("Blog", blogSchema);

export default Blog;
