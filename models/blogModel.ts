import mongoose from "mongoose";
import slugify from "slugify";
// https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
import crypto from "crypto";

export type IBlog = mongoose.Document & {
  title: string;
  description: string;
  slug: string;
  featuredImage: string;
  branch: {
    value: string;
    label: string;
  };
  semester: {
    value: string;
    label: string;
  };
  subject: {
    value: string;
    label: string;
  };
  tags: string[];
  tagsString: string;
  likes: string[];
  content: string;
  user: mongoose.Schema.Types.ObjectId;
  createdAt: string;
  updatedAt: string;
  draft: boolean;
  reviewed: boolean;
  anonymous: boolean;
  
};
const blogSchema = new mongoose.Schema<IBlog>(
  {
    title: {
      type: String,
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
    tagsString: { type: String, default: "" },
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
    anonymous: {
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

// Here index is used to create indexes for the fields. title: "text" is used to create a text index for the title field. This is used to search the blogs by title
blogSchema.index(
  { title: "text", description: "text", tagsString: "text" },
  // Here weights is used to give weights to the fields. title: 5 is used to give 5 times more weight to the title field than the description field
  // https://docs.mongodb.com/manual/core/index-text/#text-indexes
  { weights: { title: 5, description: 1, tagsString: 3 } }
);

/*
MONGOSH query:

db.blogs.createIndex({ title: "text", description: "text", tagsString: "text" }, { weights: { title: 5, description: 1, tagsString: 3 } })
*/

// blogSchema.virtual('comment', {}) is used to add a virtual field to the schema (Future feature)
// blogSchema.virtual('comment', {
//   ref: 'Comment',
//   foreignField: 'blog',
//   localField: '_id',
//   match: { isReply: false },
//   options: { sort: { createdAt: -1 } },
// });

// blogSchema.pre('save', {}) is used to run a function before the document is saved to the database
blogSchema.pre("save", function (next) {
  this.slug = slugify(this.title, { lower: true });
  this.slug = `${this.slug}-${crypto.randomBytes(6).toString("hex")}`;
  this.tagsString = this.tags.join(", ").toLowerCase();
  next();
});

// blogSchema.pre(/^find/, {}) is used to run a function before the query is executed
// Here the populate function is used to populate the user field with the user data
blogSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name photo bio",
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

/*
MONGOSH query:

db.blogs.find().forEach(function (blog) {
  db.blogs.update(
    { _id: blog._id },
    {
      $set: {
        tagsString: blog.tags.join(", ").toLowerCase(),
      },
    }
  );
});
*/

export default Blog;
