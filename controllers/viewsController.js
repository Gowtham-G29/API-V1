const Tour = require('../models/tourModel')

exports.getOverview = async (req, res, next) => {
    try {
        //1)get tour data from collections
        const tours = await Tour.find();
        //2)Build template

        //3)Render that template using tor data
        res.status(200).render('overview', {
            title: 'All tours',
            tours
        });

    } catch (error) {

    }


};

exports.getTour = async (req, res) => {
    //1)get the data ,for the request tour (including reviews and guide)
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: 'reviews',
        fields: 'review rating user'
    });


    //2)Build template

     //3)render the template using data from 1)
    res.status(200).render('tour', {
        title: 'The Forest Hiker Tour',
        tour
    })
}
