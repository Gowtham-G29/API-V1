const Review = require('./../models/reviewModel');


exports.getAllReviews = async (req, res, next) => {

    // it filter only the reviews for the particular tour using the tour id
    let filter = {};
    if (req.params.tourId) {
        filter = { tour: req.params.tourId }
    }
    const reviews = await Review.find(filter);

    res.status(200).json({
        status: 'Success',
        results: reviews.length,
        data: {
            reviews
        }
    })
};


exports.createReview = async (req, res, next) => {
    //allows the nested routes
    if (!req.body.tour) req.body.tour = req.params.tourId;
    if (!req.body.user) req.body.user = req.user.id;
    const newReview = await Review.create(req.body);

    res.status(201).json({
        status: 'success',
        data: {
            review: newReview
        }
    })
};

exports.deleteReview = async (req, res) => {
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