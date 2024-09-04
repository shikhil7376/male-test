const mongoose = require("mongoose");

function connectDB() {
  mongoose
    .connect('mongodb://127.0.0.1:27017/MALE_FASHION', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("DATABASE CONNECTED"))
    .catch((error) => console.log(error));
}

module.exports = connectDB;