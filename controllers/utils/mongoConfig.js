const mongoose = require("mongoose");

function connectDB() {
  mongoose
    .connect(process.env.MONGODB)
    .then(() => console.log("DATABASE CONNECTED"))
    .catch((error) => console.log(error));
}

module.exports = connectDB;