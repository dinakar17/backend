import mongoose from 'mongoose';
import slugify from 'slugify';
// Example of blogSchema:
//   {
//     _id: '5f9f1b9b9c9b9c9b9c9b9c9b',
//     title: 'Blog Title',
//     description: 'Blog Description',
//   slug: 'blog-title',
//     blogData: 'Blog Data',
//     user: '5f9f1b9b9c9b9c9b9c9b9c9b',
//    createdAt: '2020-11-01T10:00:00.000Z',
//     updatedAt: '2020-11-01T10:00:00.000Z',
//     __v: 0
//   }
const blogSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Must have title'],
        unique: true,
    },
    description: { type: String, default: '' },
    featuredImage: { type: String, default: '' },
    branch: { type: String, default: '' },
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
        required: [true, 'Must have content!'],
    },
    user: {
        type: mongoose.SchemaTypes.ObjectId,
        // Here ref is the reference to the user model. This is used to populate the user field with the user data when the blog is fetched.
        ref: 'User',
        required: [true, 'Blog must belong to a user'],
    },
}, 
// timestamps, toJSON, and toObject are used to add createdAt and updatedAt fields to the schema
{
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
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
blogSchema.pre('save', function (next) {
    this.slug = slugify(this.title, { lower: true });
    next();
});
// blogSchema.pre(/^find/, {}) is used to run a function before the query is executed
// Here the populate function is used to populate the user field with the user data
blogSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'user',
        select: 'name photo',
    });
    next();
});
// mongoose.model("Blog", blogSchema) is used to create a new model called Blog
const Blog = mongoose.model('Blog', blogSchema);
export default Blog;
