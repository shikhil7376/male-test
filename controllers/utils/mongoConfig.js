const mongoose = require("mongoose");

function connectDB() {
  mongoose
    .connect(process.env.MONGODB, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("DATABASE CONNECTED"))
    .catch((error) => console.log(error));
}

module.exports = connectDB;