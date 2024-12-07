/* eslint-disable no-use-before-define */
/* eslint-disable prettier/prettier */
const path=require('path')
const express = require('express');
const morgan = require('morgan'); // Move morgan import to the top
const rateLimit=require('express-rate-limit') ;
const helmet=require('helmet');
const mongoSanitize=require('express-mongo-sanitize');
const xss=require('xss-clean');
const hpp=require('hpp');
const compression=require('compression')

// Import routers
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter=require('./routes/reviewRoutes');
const viewRouter=require('./routes/viewRoutes');

const app = express();

//Setup the Pug templates
app.set('view engine','pug');
app.set('views',path.join(__dirname,'views'));// used define the path need to thing about slashes etc.


// 1) GLOBAL MIDDLEWARES
//set security HTTP header
app.use(helmet()); 

// Middleware for logging in development
if (process.env.NODE_ENV === 'development') { // Corrected 'NODE_ENV'
    app.use(morgan('dev'));
}

//Rate limiting
const limiter=rateLimit({
    max:100, //limit
    windowMs:60*60*1000 ,   // this makes and allows 100 request from the same ip in 1 hour
    message:'Too many resquest from this IP ,please try again in an hour !' //error message when the limit crosses
});
app.use('/api',limiter);//it works for all the routes containing /api

 // Middleware to parse JSON request bodies
app.use(express.json({limit:'10kb'})); //allows only the 10kb data per second


//Data sanitization against NOSQL query injection
app.use(mongoSanitize()); // it restrict the mongodb queries


//Data santization against xss
app.use(xss());  // restrict the HTML codes in the request body and convert into non problematic 


//Prevent parameter pollution
app.use(hpp()); 


// Serve static files from the public directory
app.use(express.static(`${__dirname}/public`)); 


//for deployment -compress all the texts we goint to send
app.use(compression());



// ROUTES

app.use('/',viewRouter); 
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews',reviewRouter);




// Handling unhandled routes
app.all('*', (req, res) => {
    res.status(404).json({
        status: 'fail',
        message: `Can't find the ${req.originalUrl} on this server!`
    });
});



// Global error handling middleware
app.use((err, req, res, next) => {
    // Set default values for status and statusCode
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Send response
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message
    });
    // No need to call next() here as we're sending a response
});

module.exports = app;
