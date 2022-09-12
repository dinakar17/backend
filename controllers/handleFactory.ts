import mongoose from "mongoose";
import APIFeatures from "../utils/apiFeatures.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";

// Note: Migration for mongoose v5 to v6 https://morioh.com/p/2e2269dadfa3

// This function is used to create a new document in the database
export const createOne = (Model: mongoose.Model<any, {}>) =>
  catchAsync(async (req, res, next) => {
    // | Step 10: create a new document in the database
    // Todo: req.body.tags is an array of strings. We need to convert it to an array of objects. For example, if req.body.tags = ["hello", "world"], then we need to convert it to [{name: "hello"}, {name: "world"}]\
    // convert "['hello', 'world']" to ['hello', 'world']
    req.body.tags = req.body.tags.replace(/'/g, '"');
    const doc = await Model.create(req.body);

    // The below response will look like this:
    // {
    //   "status": "success",
    //   "data": {}
    // }
    // | Step 11: Finally, send the response to the client
    res.status(201).json({
      status: 'success',
      data: doc,
    });
});

export const updateOne = (Model: mongoose.Model<any, {}>) =>
  catchAsync(async (req, res, next) => {
    // | Step 12: update the document in the database
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // | Step 13: If the document is not found, then throw an error
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    // | Step 14: Finally, send the response to the client 
    // response - { "status": "success", "data": doc }
    res.status(200).json({
      status: 'success',
      data: doc,
    });
  });

  export const deleteOne = (Model: mongoose.Model<any, {}>) =>
  catchAsync(async (req, res, next) => {
    // | Step 1: delete the document in the database
    const doc = await Model.findByIdAndDelete(req.params.id);

    // | Step 2: If the document is not found, then throw an error
    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    // | Step 3: Finally, send the response to the client
    // Note status:204 means that the request was successful but there is no content to send back to the client
    res.status(201).json({
      status: 'success',
      data: null,
    });
});


// // GET /api/v1/blogs?limit=20&fields=title,description,featuredImage,tags,branch,slug,createdAt,updatedAt&page=1
// export const getAll = (Model: mongoose.Model<any, {}>) =>
// // catchAsync is used to catch the error if there is any error in the code
//   catchAsync(async (req, res, next) => {
//     // req.query is used to get the query string from the url For example, if the url is http://localhost:3000/api/v1/blogs?sort=-createdAt then req.query will be { sort: '-createdAt' }
//     // This query string is used to sort the blogs in the database
//     // Note: One can understand this better if req.query is logged in the console
//     // | Step 1: Filter the query string to get only the allowed fields
//     // | Head to utils/apiFeatures.ts to see the further steps
//     const basicFeatures = new APIFeatures(Model.find(), req.query)
//       .filter()
//       .sort()
//       .limitFields();

//     // | Step 2: Get the documents from the database
//     // totalDoc is used to get the total number of blogs in the database
//     const totalDoc = await basicFeatures.query;

//     // | Step 3: paginate the documents
//     const features = basicFeatures.paginate();
    
//     // doc is used to get only the blogs that are to be displayed on the page
//     // | Step 4: Get the documents from the database
//     const doc = await features.query;

//     // This response is sent to the client and its looks like this:
//     // {
//     //   "status": "success",
//     //   "results": 2,
//     //   "data": [
//     //     {
//     //       "_id": "5f9f1b0b1b1b1b1b1b1b1b1b",
//     //       "blogData": "This is the blog data",
//     //       "title": "This is the title",
//     //       "user": "5f9f1b0b1b1b1b1b1b1b1b1b",
//     //       "description": "This is the description",
//     //       "createdAt": "2020-11-01T12:00:00.000Z",
//     //       "updatedAt": "2020-11-01T12:00:00.000Z",
//     //       "__v": 0
//     //     },
//     //     ],
//     //   "totalResults": 2
//     //   }  
//     // | Step 5: Finally, send the response to the client
//     res.status(200).json({
//       status: 'success',
//       totalResults: totalDoc.length,
//       results: doc.length,
//       data: doc,
//     });
//   });