/* eslint-disable prettier/prettier */
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const Email = require('../utils/email');
const crypto = require('crypto');


//send token if all the logging conditions are satisfied
const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}



exports.signUp = async (req, res, next) => {

    try {

        const newUser = await User.create(req.body);

        //sending the welcome email for the registeration from the utils/email.js 
        const url = `${req.protocol}://${req.get('host')}/`; //replace as we want
        // console.log(url);
        await new Email(newUser, url).sendWelcome();

        //store jwt in cookie along with response
        const token = signToken(newUser._id);
        const cookieOptions = {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
            secure: true, //only need for production
            httpOnly: true
        }

        res.cookie('jwt', token, cookieOptions);
        res.status(201).json({
            status: 'Success',
            token,
            data: {
                user: newUser
            }
        });
    } catch (err) {
        res.status(404).json({
            status: err.status,
            message: err.message
        })
    }

};





exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // 1) Check if email and password exist
        if (!email || !password) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please provide both email and password.'
            });
        }
        // console.log('Email received:', email);

        // 2) Check if user exists && password is correct
        const user = await User.findOne({ email }).select('+password');
        // console.log('User found:', user);

        if (!user) {
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid email or password.'
            });
        }

        const correct = await user.correctPassword(password, user.password);
        ('Password match:', correct);

        if (!correct) {
            return res.status(401).json({
                status: 'fail',
                message: 'Invalid email or password.'
            });
        }

        // 3) If everything is ok, send token to client
        const token = signToken(user._id);
        // console.log('Generated Token:', token);

        //store jwt in cookie along with response
        const cookieOptions = {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
            secure: true,
            httpOnly: true
        }

        res.cookie('jwt', token, cookieOptions);

        res.status(200).json({
            status: 'success',
            token
        });

    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while logging in. Please try again later.'
        });
    }
};




//protecting the routes
exports.protect = async function (req, res, next) {

    try {
        // 1) Get token and check if it exists 
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {// define the query authorization and token in headers
            token = req.headers.authorization.split(' ')[1];
        }

        // console.log('Token:', token);

        if (!token) {
            return res.status(401).json({
                status: 'fail',
                message: 'You are not logged in. Please log in to get access.'
            });
        }

        //     // 2) Verify the token
        const decoded = await jwt.verify(token, process.env.JWT_SECRET); // Make sure to define JWT_SECRET in your .env
        // console.log(decoded);

        //     // 3) Check if the user still exists
        const currentUser = await User.findById(decoded.id);
        if (!currentUser) {
            return res.status(401).json({
                status: 'fail',
                message: 'The user belonging to this token no longer exists.'
            });
        }

        //     // 4) Check if user changed password after the token was issued
        if (currentUser.changedPasswordAfter(decoded.iat)) {
            return res.status(401).json({
                status: 'fail',
                message: 'User recently changed password! Please log in again.'
            });
        }

        // Grant access to the protected route
        req.user = currentUser;
        next();

    } catch (err) {
        res.status(401).json({
            status: 'fail',
            message: 'Unauthorized access.'
        });
    }
};



exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // req.user is set from the protect middleware
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                status: 'fail',
                message: 'You do not have permission to perform this action'
            });
        }

        next(); // Proceed to the next middleware if the user has permission
    };
};



//forgot password
exports.forgotPassword = async (req, res, next) => {
    try {
        // 1) Get user based on the posted email
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'There is no user with that email address'
            });
        }

        // 2) Generate random reset token
        const resetToken = user.createPasswordResetToken(); // From the global function in userModel
        await user.save({ validateBeforeSave: false }); //special method to save encrypt token in database

        // 3) Send it to user's email

        // const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

        try {
            const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`; // this is a link format just for example

            //from the email.js class
            await new Email(user, resetURL).sendPasswordReset();

            res.status(200).json({
                status: 'success',
                message: 'Token sent to email!'
            });
        } catch (err) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });

            return res.status(500).json({
                status: 'fail',
                message: 'There was an error sending the email. Try again later!'
            });
        }

    } catch (err) {
        return res.status(500).json({
            status: 'fail',
            message: err.message || 'Something went wrong'
        });
    }
};




//resetpassword functionality 
exports.resetPassword = async (req, res, next) => {

    try {
        //1)get user based on the token
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        // find user based on the reset token in the database and check the expiry of the token
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        //2)if Token has not expired , and there is user,set the new password
        if (!user) {
            throw Error('Token is invalid or has expired !');
            next();
        }
        //set new password
        user.password = req.body.password;
        user.passwordConfirm = req.body.passwordConfirm;
        user.passwordResetExpires = undefined;
        user.passwordResetToken = undefined;

        await user.save();


        //3)update changedPasswordAt property for the user ---> this was coded as a global function in user model

        //4)Log the user in,send jWT

        const token = signToken(user._id);
        //store jwt in cookie along with response
        const cookieOptions = {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
            secure: true,
            httpOnly: true
        }
        res.cookie('jwt', token, cookieOptions);
        res.status(201).json({
            status: 'success',
            token
        });

    } catch (err) {
        return res.status(500).json({
            status: 'fail',
            message: err.message || 'Something went wrong'
        });
    }


}

//update the current user password
exports.updatePassword = async (req, res, next) => {
    try {
        //1)get the user from collections
        const user = await User.findById(req.user.id).select('+password');
        // console.log('User Retrieved:', user);

        //2) check if posted currect password is correct
        if (!await user.correctPassword(req.body.passwordCurrent, user.password)) {
            // console.log('Incorrect current password.');
            return res.status(401).json({
                status: 'fail',
                message: 'Incorrect current password.'
            });
        }
        // 3) if so update the password
        user.password = req.body.password;
        user.passwordConfirm = req.body.passwordConfirm;
        await user.save();  // save in the database


        //4) login user and send JWT
        const token = signToken(user._id);
        //store jwt in cookie along with response
        const cookieOptions = {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
            secure: true,
            httpOnly: true
        }

        res.cookie('jwt', token, cookieOptions);
        res.status(200).json({
            status: 'success',
            token
        });

    } catch (err) {
        console.error('Error in updatePassword:', err.message);
        res.status(500).json({
            status: 'fail',
            message: 'Internal server error.'
        });
    }
};
