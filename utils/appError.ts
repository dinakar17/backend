// assign types to attributes of class AppError


// Todo: Learn more about Typescript while dealing with classes in Javascript
class AppError extends Error {
    statusCode: number;
    status: string;
    isOperational: boolean;
    constructor(message: string, statusCode: number) {
      super(message);
  
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true;
  
      // Error.captureStackTrace() is used to remove the constructor function from the stack trace and only show the stack trace of the function that called the constructor function
      // For example, if the constructor function is called in the catch block of a try-catch block, then the stack trace will only show the stack trace of the try block
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  export default AppError;
  