import path from 'path';

import mongoose from 'mongoose';
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';

import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import compression from 'compression';

import globalErrorHandler from './controllers/errorController.js';

import cors from 'cors';
import bodyParser from 'body-parser';

import { dirname } from 'path';
import { fileURLToPath } from 'url';

import userRouter from './routes/userRoutes.js';
import blogRouter from './routes/blogRoutes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config();

let DB = process.env.DATABASE;

mongoose
  .connect(DB as string)
  .then(() => console.log('DB connected'));

const app: Express = express();

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

app.use(cors());

// serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

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
  app.use(morgan('dev'));
}

app.use(mongoSanitize());

app.use(hpp());

app.use(compression());

app.use('/api/v1/users', userRouter);

app.use('/api/v1/blogs', blogRouter);

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Hello World',
  });
});

app.use(globalErrorHandler);

export default app;