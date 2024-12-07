/* eslint-disable prettier/prettier */
const mongoose = require('mongoose');
const User = require('../models/userModel');
const Review = require('./reviewModel');

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a name'],
        unique: true,
        trim: true  // Remove the white spaces

    },
    duration: {
        type: Number,
        required: [true, 'A tour must have a duration']

    },
    maxGroupSize: {
        type: Number,
        required: [true, 'A tour must have the group size']
    },

    difficulty: {
        type: String,
        required: [true, 'A tour must have a difficulty']
    },

    ratingsAverage: {
        type: Number,
        default: 4.5,
        min:[1,'Rating must be above 1.0'],
        max:[5,'Rating must be below 5.0'],
        set:val=>Math.round(val*10)/10
    },
    ratingQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price']
    },

    discountDiscount: Number,
    summary: {
        type: String,
        trim: true,  // Remove the white spaces
        required: [true, 'A tour must have the summary']
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, 'A tour must have the cover image']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now()
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    //geospatial data
    startLocation: {
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    location: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    guides: [
        {
            type: mongoose.Schema.ObjectId,
            ref: "User"
        }
    ],
    // instead like this child referencing we implement the virtual populate
    // reviews: [
    //     {
    //         type: mongoose.Schema.ObjectId,
    //         ref:'Review'
    //     }

    // ]

});


// // this makes improving the read performance with indexes 
// tourSchema.index({price:1,ratingAverage:-1});

tourSchema.index({startLocation:'2dsphere'})

//embedding guides
tourSchema.pre('save', async function (next) {
    const guidesPromise = this.guides.map(async id => await User.findById(id));
    this.guides = await Promise.all(guidesPromise);
    next();
});

//virtula populate - connect two models
tourSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'tour',
    localField: '_id'
})


const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour; 
