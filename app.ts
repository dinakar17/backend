import path from 'path';

import mongoose from 'mongoose';
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';

import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import mongoSanitize from 'express-mongo-sanitize';
// import xss from 'xss-clean';
import hpp from 'hpp';
import compression from 'compression';

import cors from 'cors';

import { dirname } from 'path';
import { fileURLToPath } from 'url';

import userRouter from './routes/userRoutes.js';

// direname(fileURLToPath(import.meta.url)) is used to get the current directory path of the file
const __dirname = dirname(fileURLToPath(import.meta.url));

// process.on() is a global event handler that is called whenever an uncaught exception occurs
// This could be a syntax error, a reference error, or any other error that is not handled by the application
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// dotenv.config() loads the environment variables from the .env file into process.env
dotenv.config();

// Connect to the mongoDB database
let DB = process.env.DATABASE;

// This is piece of code that is used to connect to the database
// https://stackoverflow.com/questions/68958221/mongoparseerror-options-usecreateindex-usefindandmodify-are-not-supported
mongoose
  .connect(DB as string)
  .then(() => console.log('DB connected'));

const app: Express = express();

// app.use(cores()) is used to allow cross-origin requests
app.use(cors());
// app.use(cors({
//   origin: `${process.env.CLIENT_URL}`
// }))

// app.use(express.static(path.join(__dirname, 'public'))) is used to serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// app.use(helmet()) is used to set security HTTP headers to protect the application from well-known web vulnerabilities
app.use(helmet());

if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!',
  });
  app.use('/api', limiter);
}


if (process.env.NODE_ENV === 'development') {
  // app.use(morgan('dev')) is used to log requests to the console in the development environment
  app.use(morgan('dev'));
}

// app.use(express.json()) is used to parse incoming requests with JSON payloads
app.use(express.json({ limit: '50kb' }));

// app.use(mongoSanitize()) is used to sanitize data against NoSQL query injection attacks by removing dollar signs and dots from the request body
app.use(mongoSanitize());

// app.use(xss());

// app.use(hpp()) is used to prevent parameter pollution by whitelisting the query parameters that are allowed to be repeated in the request
app.use(hpp());

// app.use(compression()) is used to compress the text-based responses sent to the client in the gzip format
app.use(compression());


// The following routes are used to handle requests to the different endpoints of the application and are defined in the routes folder
// From here on, head over to the routes folder to see how the routes are defined
app.use('/api/v1/users', userRouter);


app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Hello World',
  });
});

export default app;