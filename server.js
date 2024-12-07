
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

//established database connections
const DB = process.env.DATABASE;



mongoose.connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,

})
    .then(() => {
        // console.log("DB connection is established");
    })
    .catch((err) => {
        // console.log('ERR: ', err);
    });


const app = require('./app');

const port = process.env.PORT || 8000;
app.listen(port, () => {
    // console.log(`App running on port ${port}`);
});