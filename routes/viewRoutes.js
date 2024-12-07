const express = require('express');
const viewController = require('./../controllers/viewsController');

const router = express.Router();

router.get('/', (req, res) => {
    res.status(200).render('base', {
        tour: 'The Forest Hiker',
        user: 'Jonas'
    });
});

router.get('/', viewController.getOverview);

router.get('/tour/:slug', viewController.getTour);

module.exports = router;