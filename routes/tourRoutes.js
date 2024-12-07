/* eslint-disable prettier/prettier */

const express = require('express');
const tourController = require('../controllers/tourController');//can also extracting by destructuring
const authController = require('../controllers/authenticationController');

const reviewRouter = require('./../routes/reviewRoutes')



const tourRouter = express.Router();


//Nested routes

//POST /tour/2993dhjhu3/reviews
//GET /tour/hg7669hgf/reviews
//GET /tour/67bhjk/reviews/gytgki8o 

tourRouter.use('/:tourId/reviews', reviewRouter)





tourRouter.route('/top-5-cheap').get(tourController.aliasTopTours, tourController.getAllTours);

//aggregate pipeline
tourRouter.route('/tour-stats')
    .get(tourController.getTourStats);

tourRouter.route('/monthly-plan/:year')
    .get(authController.protect,
        authController.restrictTo('admin', 'lead-guide', 'guides'), tourController.getMontlyPlan);

//Geospatial queries for finding the Tour within the radius
// /tours-distance?distance=223&center=-40,67&unit=mi
// /tours-distance/223/center/-40,67/unit/mi
tourRouter.route('/tours-within/:distance/center/:latlng/unit/:unit').get(tourController.getToursWithin);

//getting tours from the particular distance
tourRouter.route('/distances/:latlng/unit/:unit').get(tourController.getDistance);


//Tour routes
tourRouter.route('/')
    .get(tourController.getAllTours)
    .post(authController.protect, authController.restrictTo('admin', 'lead-guide'), tourController.createTours);

tourRouter.route('/:id')
    .get(tourController.getTour)
    .patch(authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.uploadTourImages, tourController.resizeTourImages, tourController.updateTour)
    .delete(authController.protect,
        authController.restrictTo('admin', 'lead-guide'),
        tourController.deleteTour);



module.exports = tourRouter; 