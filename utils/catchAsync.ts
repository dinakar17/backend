import { Request, Response, NextFunction } from 'express';
// Ref: https://wesbos.com/javascript/12-advanced-flow-control/71-async-await-error-handling

type AsyncFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>;

// Basically we're creating a function that takes in a function and returns a function that takes in req, res and next as parameters
// Here we're handling errors using Higher Order Functions (HOF)
export default (fn: AsyncFunction) => (req: Request, res: Response, next: NextFunction) => {
    // fn(req, res, next).catch(next) is the same as:
    // fn(req, res, next).catch((err) => next(err)) and is used to catch any errors that are thrown in the async function
    // Also, fn(req, res, next) is a promise that is returned from the function that is passed in as an argument to this function
    // Note: The error is handled and passed to the next middleware in the middleware stack
    fn(req, res, next).catch(next);
};
  