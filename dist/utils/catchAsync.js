export default (fn) => (req, res, next) => {
    // fn(req, res, next).catch(next) is the same as:
    // fn(req, res, next).catch((err) => next(err)) and is used to catch any errors that are thrown in the async function
    // Also, fn(req, res, next) is a promise that is returned from the function that is passed in as an argument to this function
    fn(req, res, next).catch(next);
};
