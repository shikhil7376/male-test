const dotenv = require("dotenv");
dotenv.config();






module.exports = {
    RAZORPAY_ID_KEY:process.env.RAZORPAY_ID_KEY,
    RAZORPAY_SECRET_KEY : process.env.RAZORPAY_SECRET_KEY
}