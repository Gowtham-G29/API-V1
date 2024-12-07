/* eslint-disable prettier/prettier */
const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs')


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name !']
    },

    email: {
        type: String,
        required: [true, 'Please enter your email!'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide the vallid email !']
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 8,
        select: false // hide the password for response
    },
    passwordConfirm: {
        type: String,
        required: [true, 'please confirm your password !'],
        validate: {
            //this only works on save in authcontroller
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passwords are not same!'
        },

    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    //for deactive the account or delete the account
    active: {
        type: Boolean,
        default: true,
        select: false
    }

});



// //query middlewares
userSchema.pre('save', async function (next) {
    //only runs this password is actually modified
    if (!this.isModified('password')) return next();
    //hash the password with cost of 12 round
    this.password = await bcrypt.hash(this.password, 12);  // encrypt the password
    this.passwordConfirm = undefined;   //delete the confirmed password after deletion

    next();

});


//this makes when the we use the find method to get the user only return the active property is true
userSchema.pre(/^find/, function (next) {
    //this points to the current query
    this.find({ active: { $ne: false } }); // dont use the directly false
    next();
})

//-----------------------------------------------------------------------------------------------------------------------

//verifying jwt

//global function is created here it is available in all the files using methods
userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};



userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
        return JWTTimestamp < changedTimestamp;
    }
    // False means NOT changed
    return false;
};

userSchema.methods.createPasswordResetToken = function () {
    // Create a random 32-byte token
    const resetToken = crypto.randomBytes(32).toString('hex');
    // Encrypt the reset token and store it in the database
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    console.log({ resetToken }, this.passwordResetToken);
    // Set the password reset token's expiration time (10 minutes from now)
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    // Return the unencrypted reset token
    return resetToken;
};


// //reset password changed time saving middleware
userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
})


const User = mongoose.model('User', userSchema);

module.exports = User;