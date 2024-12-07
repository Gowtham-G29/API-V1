/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable prettier/prettier */
const Tour = require('../models/tourModel');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Commented-out parts can be kept for future use if needed
// const fs = require('fs');
// const tours = JSON.parse(fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`));

// Uncomment this if you want to check the ID before proceeding
// exports.checkID = (req, res, next, val) => {
//     console.log(`Tour id is: ${val}`);
//     if (req.params.id * 1 > tours.length) {
//         return res.status(404).json({
//             status: "failed",
//             message: "Invalid ID"
//         });
//     }
//     next();
// }

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

//fields for uploading multiple images in form data
exports.uploadTourImages = upload.fields([
    { name: 'imageCover', maxCount: 1 },
    { name: 'images', maxCount: 3 }
]);

//upload.single('images') req.file
// upload.array('images',5); req.files

exports.resizeTourImages = async (req, res, next) => {
    if (!req.files.imageCover || !req.files.images) return next();

    const outputPath = path.join(__dirname,'../public/img/tours');

    // Ensure directory exists
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    // Generate cover image filename
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

    try {
        // 1) Process cover image
        await sharp(req.files.imageCover[0].buffer)
            .resize(2000, 1333)
            .toFormat('jpeg')
            .jpeg({ quality: 90 })
            .toFile(`${outputPath}/${req.body.imageCover}`);

        // 2) Process other images
        req.body.images = [];
        await Promise.all(
            req.files.images.map(async (file, i) => {
                const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

                await sharp(file.buffer)
                    .resize(2000, 1333)
                    .toFormat('jpeg')
                    .jpeg({ quality: 90 })
                    .toFile(`${outputPath}/${filename}`);

                req.body.images.push(filename);
            })
        );
        next();
    } catch (error) {
        return res.status(500).json({
            status: 'fail',
            message: 'Error processing image',
            error: error.message
        });
    }
};

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
};




exports.getAllTours = async (req, res) => {

    try {

        //Build a query 

        //1)basic filtering
        const queryObj = { ...req.query };
        const excludedFields = ['page', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);

        // Advanced filtering
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
        JSON.parse(queryStr);

        let query = Tour.find(JSON.parse(queryStr));

        // 2) Sorting
        // console.log(req.query);

        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt'); // Default sorting
        }

        //3)fields limiting
        if (req.query.fields) {
            const fields = req.query.fields.split(',').join(' ');
            query = query.select(fields);
        } else {
            query = query.select('-__v')
        }

        //4)pagination
        const page = req.query.page * 1 || 1;
        const limit = req.query.limit * 1 || 100;
        const skip = (page - 1) * limit;
        query = query.skip(skip).limit(limit);

        if (req.query.page) {
            const numTours = await Tour.countDocuments();
            if (skip >= numTours) {
                throw new Error('This page doesnt exist ');
            }
        }
        //Execute the query
        const tours = await query;
        //Send response
        res.status(200).json({
            status: 'success',
            // Uncomment these if you want to return actual data
            results: tours.length,
            data: {
                tours
            }
        });
    }
    catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message
        })
    }

};



exports.createTours = async (req, res) => {
    try {
        const newTour = await Tour.create(req.body);
        res.status(201).json({
            status: "success",
            data: {
                tour: newTour
            }
        });


    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message  // Added `err.message` for clarity
        });
    }
};

exports.getTour = async (req, res) => {

    try {
        // const tour = await Tour.findById(req.params.id).populate({
        //     path: 'guide',
        //     select: '-_v -passwordChangedAt'
        // });
        const tour = await Tour.findById(req.params.id).populate('reviews');
        ;
        //Tour.findOne({_id:req.params.id})

        res.status(200).json({
            status: 'success',
            data: {
                tour
            }
        });

    }
    catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message
        })
    }


};



exports.updateTour = async (req, res) => {
    try {

        const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        })

        res.status(201).json({
            status: "success",
            data: {
                tour
            }
        });
    }
    catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message
        })
    }


};

exports.deleteTour = async (req, res) => {
    try {
        await Tour.findByIdAndDelete(req.params.id);
        res.status(204).json({
            status: 'success',
            data: null
        })
    }
    catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message
        })
    }
}

exports.getTourStats = async (req, res) => {
    try {
        const stats = await Tour.aggregate([
            {
                $match: { ratingsAverage: { $gte: 4.5 } }
            },
            {
                $group: {
                    _id: null,
                    numTours: { $sum: 1 },
                    numRatings: { $sum: '$ratingQuantity' },
                    avgRating: { $avg: '$ratingsAverage' },
                    avgPrice: { $avg: '$price' },
                    minPrice: { $min: '$price' },
                    maxPrice: { $max: '$price' }

                }
            },
            {
                $sort: { avgPrice: 1 }
            }
        ])
        res.status(200).json({
            status: 'success',
            data: {
                stats
            }
        })
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message
        })
    }
}




//Business problem get a busiest month using aggregative function
exports.getMontlyPlan = async (req, res) => {
    try {
        const year = req.params.year * 1; // Convert year to number
        const plan = await Tour.aggregate([
            {
                $unwind: '$startDates'
            },
            {
                $match: {
                    startDates: {
                        $gte: new Date(`${year}-01-01`),
                        $lte: new Date(`${year}-12-31`),
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$startDates' }, // Correct field reference
                    numToursStarts: { $sum: 1 },
                    tours: { $push: '$name' }
                }
            },
            {
                $addFields: { month: '$_id' }
            },
            {
                $project: {
                    _id: 0 // Exclude the _id field from the output
                }
            },
            {
                $sort: {
                    numToursStarts: -1 // Sort by numToursStarts in descending order
                }
            },
            {
                $limit: 6 // Limit the results to 6
            }
        ]);

        res.status(200).json({ // Fixed typo here
            status: 'success',
            data: {
                plan
            }
        });

    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err.message
        });
    }
};

//Geospatial queries for finding the Tour within the radius
// /tours-distance/223/center/-40,67/unit/mi
exports.getToursWithin = async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(',');

    //convert radius into radians
    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    if (!lat || !lng) {
        return res.status(400).json({
            status: 'fail',
            message: 'please Provide latitude longitude in the format lat,lng '
        })
    }

    const tours = await Tour.find(
        { startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } } });

    res.status(200).json({
        status: 'Success',
        results: tours.length,
        data: {
            data: tours
        }
    })
};


//getting tours from the particular distance by aggregating
exports.getDistance = async (req, res, next) => {
    try {

        const { latlng, unit } = req.params;
        const [lat, lng] = latlng.split(',');

        const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

        if (!lat || !lng) {
            return res.status(400).json({
                status: 'fail',
                message: 'please Provide latitude longitude in the format lat,lng '
            })
        }
        const distances = await Tour.aggregate([
            {
                // Use geoNear for geospatial aggregation
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)],
                    },
                    distanceField: 'distance', // Field to store calculated distance
                    spherical: true, // Use spherical distance calculations
                    distanceMultiplier: multiplier
                },
            },
            {
                // Project only relevant fields
                $project: {
                    distance: 1, // Include distance in the result
                    name: 1, // Include tour name
                },
            },
        ]);

        res.status(200).json({
            status: 'Success',
            data: {
                data: distances
            }
        })
    } catch (error) {
        return res.status(400).json({
            status: 'fail',
            message: error.message
        })
    }
}