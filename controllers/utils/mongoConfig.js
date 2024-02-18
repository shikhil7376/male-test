const mongoose = require("mongoose");

function connectDB() {
  mongoose
    .connect("mongodb+srv://shikhilkrishnan2018:RFwCrT6m5lYg60Iv@ecommerce-projectdb.5ftlmhk.mongodb.net/?retryWrites=true&w=majority")
    .then(() => console.log("DATABASE CONNECTED"))
    .catch((error) => console.log(error));
}

module.exports = connectDB;