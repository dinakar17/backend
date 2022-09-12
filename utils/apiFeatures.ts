import mongoose, { Query } from "mongoose";

// This API Features class basically queries the database using the "filter()" method and the "sort()" method and the "limitFields()" method and the "paginate()" method
class APIFeatures {
    query: Query<any, any>;
    queryString: any;
    // Todo: Fix types of query and queryString
    // | Step 2: Create two properties in this class called "query" (Model.find()) and "queryString" (req.query)
    constructor(query: Query<any, any>, queryString: any) {
      // Note: The results returned by the database are stored in the "query" variable
      this.query = query;
      this.queryString = queryString;
    }
  
  // One Sentence Explanation: filter() finds and then sort() sorts them and then limitFields() limits the fields and then paginate() paginates them
  
  
  // This "filter" function is used to filter the blogs
    async filter() {
      // {...this.queryString} is used to copy the query string. For example, if the query string is { sort: '-createdAt', page: '2', limit: '5' } then {...this.queryString} will be { sort: '-createdAt', page: '2', limit: '5' }
      const queryObj = { ...this.queryString };
      // excluded fields are the fields that are not required to be filtered
      const excludedFields = ['page', 'sort', 'limit', 'fields'];
  
      // This loop will remove the excluded fields from the query string. For example, if the query string is { sort: '-createdAt', page: '2', limit: '5' } and the excluded fields are ['page', 'sort', 'limit', 'fields'] then the query string will be { sort: '-createdAt' } after this loop
      // Another example, if the query string is { sort: '-createdAt', page: '2', limit: '5', fields: 'title,author' } and the excluded fields are ['page', 'sort', 'limit', 'fields'] then the query string will be { sort: '-createdAt', fields: 'title,author' } after this loop
      excludedFields.forEach((el) => delete queryObj[el]);
  
      // JSON.stringify(queryObj) will convert the query string to a string. For example, if the query string is { sort: '-createdAt', fields: 'title,author' } then JSON.stringify(queryObj) will be { "sort": "-createdAt", "fields": "title,author" }
      let queryStr = JSON.stringify(queryObj);
  
      // queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`) is used to replace the query string with the "$" sign
      queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
  
      // this.query.find(JSON.parse(queryStr)) will find the blogs based on the query string
      // Step 1: Finding the blogs based on the query string
      this.query = this.query.find(JSON.parse(queryStr));
      await this.query.clone();
  
      // "this" is returned so that the "filter()" function can be chained with other functions
      return this;
    }
  
    sort() {
      // this.queryString.sort is used to get the sort query string. For example, if the query string is { sort: '-createdAt' } then this.queryString.sort will be '-createdAt'
      if (this.queryString.sort) {
        // this.queryString.sort.split(',').join(' ') is used to split the sort query string and then join it with a space. For example, if the sort query string is '-createdAt' then this.queryString.sort.split(',').join(' ') will be '-createdAt'
        const sortBy = this.queryString.sort.split(',').join(' ');
        // this.query = this.query.sort('-createdAt') is used to sort the blogs based on the sort query string. For example, if the sort query string is '-createdAt' then this.query = this.query.sort('-createdAt') will sort the blogs based on the createdAt date
        this.query = this.query.sort(sortBy);
      } else {
        // this.query = this.query.sort('-createdAt') is used to sort the blogs based on the createdAt date
        // Step 2: Sorting the blogs based on the createdAt date
        this.query = this.query.sort('-createdAt');
      }
  
      // "this" is returned so that the "sort()" function can be chained with other functions
      return this;
    }
  
    limitFields() {
      // this.queryString.fields is used to get the fields query string. For example, if the query string is { fields: 'title,author' } then this.queryString.fields will be 'title,author'
      if (this.queryString.fields) {
        // this.queryString.fields.split(',').join(' ') is used to split the fields query string and then join it with a space. For example, if the fields query string is 'title,author' then this.queryString.fields.split(',').join(' ') will be 'title author'
        const fields = this.queryString.fields.split(',').join(' ');
        // this.query = this.query.select('title author') is used to select the blogs based on the fields query string. For example, if the fields query string is 'title,author' then this.query = this.query.select('title author') will select the blogs based on the title and author
        this.query = this.query.select(fields);
      } else {
        // this.query = this.query.select('-__v') is used to select the blogs based on the "-__v" field
        // Step 3: Selecting the blogs based on the "-__v" field
        this.query = this.query.select('-__v');
      }
  
      return this;
    }
  
    // "paginate()" function is used to paginate the blogs
    paginate() {
      // this.queryString.page is used to get the page query string. For example, if the query string is { page: '2' } then this.queryString.page will be '2'
      const page = this.queryString.page * 1 || 1;
      // this.queryString.limit is used to get the limit query string. For example, if the query string is { limit: '5' } then this.queryString.limit will be '5'
      const limit = this.queryString.limit * 1 || 100;
  
      // (page - 1) * limit is used to skip the blogs. For example, if the page query string is '2' and the limit query string is '5' then (page - 1) * limit will be 5. This means that the first 5 blogs will be skipped and the next 5 blogs will be shown
      const skip = (page - 1) * limit;
  
      // this.query = this.query.skip(5).limit(5) is used to skip the first 5 blogs and then show the next 5 blogs
      // Step 4: Skipping the first 5 blogs and then showing the next 5 blogs
      this.query = this.query.skip(skip).limit(limit);
  
      return this;
    }
  }
  
  export default APIFeatures;
  