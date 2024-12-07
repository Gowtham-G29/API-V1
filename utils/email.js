const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text'); //convert the html to text

module.exports = class Email {
    constructor(user, url) {
        this.to = user.email,
            this.firstName = user.name.split(' ')[0];
        this.url = url;
        this.from = process.env.EMAIL_FROM;
    }

    newTransport() {
        if (process.env.NODE_ENV === 'production') {
            //sendgrid
            return 1;
        }

        return nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            // service: 'Gmail', // Uncomment if using Gmail, otherwise use host and port
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });

    }
    async send(template, subject) {
        //send the Actual mail

        //1)Render HTML based on pug template
        const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
            firstName: this.firstName,
            url: this.url,
            subject
        });
        //2)Define email options
        const mailOptions = {
            from: this.from,
            to: this.to,
            subject,
            html,
            text: htmlToText.convert(html)
            // HTML option (if needed)
        };

        //3) Create a Transport and send email
        await this.newTransport().sendMail(mailOptions);
    }

    async sendWelcome() {
        await this.send('welcome', 'Welcome to the Natours Family !');
    };

    async sendPasswordReset() {
        await this.send('passwordReset', 'Your Password Reset token ( valid for only 10 minutes)')
    }
};






// const sendMail = async (options) => {
// // 1) Create a transporter - sender
// const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     // service: 'Gmail', // Uncomment if using Gmail, otherwise use host and port
//     auth: {
//         user: process.env.EMAIL_USERNAME,
//         pass: process.env.EMAIL_PASSWORD
//     }
// });

//     // 2) Define the email options
//     const mailOptions = {
//         from: 'gowthamguru481@gmail.com',
//         to: options.email,
//         subject: options.subject,
//         text: options.message
//         // HTML option (if needed)
//     };

//     // 3) Actually send the email
//     await transporter.sendMail(mailOptions);
// };

// module.exports = sendMail;
