import mongoose from "mongoose";
import slugify from "slugify";
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
    },
    description: { type: String, default: "" },
    featuredImage: { type: String, default: "" },
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
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

blogSchema.index(
  { title: "text", description: "text", tagsString: "text" },
  { weights: { title: 5, description: 1, tagsString: 3 } }
);


blogSchema.pre("save", function (next) {
  this.slug = slugify(this.title, { lower: true });
  this.slug = `${this.slug}-${crypto.randomBytes(6).toString("hex")}`;
  this.tagsString = this.tags.join(", ").toLowerCase();
  next();
});

blogSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name photo bio",
  });
  next();
});


const Blog = mongoose.model<IBlog>("Blog", blogSchema);

export default Blog;
