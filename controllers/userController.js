/* eslint-disable prettier/prettier */
const User = require('../models/userModel');
const multer = require('multer');
const sharp = require('sharp'); // image processing library
const fs = require('fs');
const path = require('path');


//Multer - To upload images
//-----------------------------------------------------------------------

//multer storage --> this type of declaration is only for without need of image resizing

// const multerStorage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'public/img/user');
//     },
//     filename: (req, file, cb) => {
//         //user-userId-timestamp.jpeg
//         const ext = file.mimetype.split('/')[1];
//         cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//     }
// });

const multerStorage = multer.memoryStorage();

//multer filter - to check the uploaded file as image
const multerFilter = (req, file, cb) => {

    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(res.status(400).json({
            status: 'fail',
            message: 'Not an image ! Please Upload the only image'
        }))
    }
};

//use the multer storage and multer filter
const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

//------------------------------------------------------------------------------


//for upload the images 
exports.uploadUserPhoto = upload.single('photo');


//for resize the images for profile
exports.resizeUserPhoto = async (req, res, next) => {
    if (!req.file) return next();

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

    const outputPath = path.join(__dirname, '../public/image/user');

    // Ensure directory exists
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    try {
        // Process the file using sharp
        await sharp(req.file.buffer)
            .resize(500, 500)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`${outputPath}/${req.file.filename}`);
        next();

    } catch (error) {
        return res.status(500).json({
            status: 'fail',
            message: 'Error processing image',
            error: error.message
        });
    }
};





//filtering data function
const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) {
            newObj[el] = obj[el];
        }
    });
    return newObj;
}


exports.getAllUsers = async (req, res) => {

    const users = await User.find();

    res.status(200).json({
        status: 'success',
        results: users.length,
        data: {
            users
        }
    });
};


exports.createUsers = (req, res) => {
    res.status(500).json({
        status: 'error',
    });
}

exports.getMe = async (req, res, next) => {
    req.params.id = req.user.id;
    next();
}


//Update the current user data
exports.updateMe = async (req, res, next) => {

    // console.log(req.file);
    // console.log(req.body);

    //1)create error if user Posts password data
    if (req.body.password || req.body.passwordConfirm) {
        return res.status(400).json({
            status: 'Invalid request',
            message: "This route is not for Password update"
        })
    }
    //2)filterd Out unwanted fields names that are allowed to be updated
    const filteredBody = filterObj(req.body, 'name', 'email'); // it restrict only the particular fields is updated like name, email and not allow allowed to update the role etc...,\
    if (req.file) filteredBody.photo = req.file.filename;

    //3)update user document -->findByIdandUpdate is used because in the schema password is a required field
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        status: 'success',
        data: {
            user: updatedUser
        }
    });
}

//Delete or deactivate the current user
exports.deleteMe = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                status: 'fail',
                message: 'You are not logged in. Please log in to delete your account.'
            });
        }

        await User.findByIdAndUpdate(req.user.id, { active: false });

        res.status(200).json({
            status: 'success',
            message: 'Your account has been successfully deactivated.'
        });

    } catch (err) {
        console.error('Error in deleteMe:', err);
        return res.status(500).json({
            status: 'fail',
            message: 'Something went wrong while deactivating your account.'
        });
    }
};


exports.getUser = async (req, res) => {

    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'User not found'
            })
        }
        res.status(200).json({
            status: 'success',
            data: {
                user
            }
        })
    }
    catch (err) {
        res.status(500).json({
            status: 'error',
            message: 'This route is not yet defined'
        });
    }
}


exports.updateUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined'
    });
}

exports.deleteUser = (req, res) => {
    res.status(500).json({
        status: 'error',
        message: 'This route is not yet defined'
    });
}
