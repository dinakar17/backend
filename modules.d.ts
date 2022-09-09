declare module 'mongoose';
declare module 'morgan';
declare module 'express-rate-limit';
declare module 'express-mongo-sanitize';
declare module 'hpp';
declare module 'compression';
declare module 'cors';
declare module 'dotenv';
declare module 'helmet';
declare module 'jsonwebtoken';
declare module 'bcryptjs';
declare module 'validator';
declare module 'nodemailer';
declare module 'pug';
declare module 'html-to-text';

// ? Resolve this error
// Error 1: Cannot find module 'helmet'. Did you mean to set the 'moduleResolution' option to 'node', or to add aliases to the 'paths' option?
// Error 2: Could not find a declaration file for module 'bcryptjs'. 'c:/Users/Dinakar/Documents/NITC Blogs/backend/node_modules/bcryptjs/index.js' implicitly has an 'any' type.
//  Try `npm i --save-dev @types/bcryptjs` if it exists or add a new declaration (.d.ts) file containing `declare module 'bcryptjs';`