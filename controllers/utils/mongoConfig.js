const mongoose = require("mongoose");

function connectDB() {
  mongoose
    .connect("mongodb+srv://shikhilkrishnan2018:sw8CoMADTmww1Wde@cluster0.ljc9fy4.mongodb.net/")
    .then(() => console.log("DATABASE CONNECTED"))
    .catch((error) => console.log(error));
}

module.exports = connectDB;