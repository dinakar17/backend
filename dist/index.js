// Entry point for the application
import dotenv from 'dotenv';
import app from './app.js';
dotenv.config();
const port = process.env.PORT;
const server = app.listen(port, () => {
    console.log(`App running on port ${port}...`);
});
// process.on() is a global event handler that is called whenever an uncaught rejection occurs
// ? Unknown 
process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
process.on('SIGTERM', () => {
    console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
    server.close(() => {
        console.log('💥 Process terminated!');
    });
});
