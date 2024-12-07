/* eslint-disable prettier/prettier */

const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authenticationController');
const router = require('./reviewRoutes');



//ROUTES
const userRouter = express.Router();

userRouter.post('/signup', authController.signUp);
userRouter.post('/login', authController.login);
// password change route
userRouter.post('/forgotPassword', authController.forgotPassword);
userRouter.patch('/resetPassword/:token', authController.resetPassword);
// for current user password change
userRouter.patch('/updateMyPassword', authController.protect, authController.updatePassword);
//for get current user
userRouter.get('/me',authController.protect,userController.getMe,userController.getUser);
// for current user Data update
userRouter.patch('/updateMe',authController.protect,userController.uploadUserPhoto,userController.resizeUserPhoto,userController.updateMe);
//for delete or deactivate the current user
userRouter.delete('/deleteMe',authController.protect,userController.deleteMe);
 
 

//-----------------------------------------------------------//



router.use(authController.restrictTo('admin')); // this will be applicable to all the belowed routes only because the  middlewares are executed in the sequence

//User route
userRouter.route('/')
    .get(userController.getAllUsers) // the authcontroller middleware is executed successfully then only the route is executed
    .post(userController.createUsers);

userRouter.route('/:id')
    .get(userController.getUser)
    .patch(userController.updateUser)
    .delete(userController.deleteUser);


module.exports = userRouter;