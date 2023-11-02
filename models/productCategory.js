const mongoose = require("mongoose");

const productCategorySchema = new mongoose.Schema({
     categoryName: {
        type: String,
        required: true
     },
     description: {
        type: String,
        required: true
     },
     image: {
        data: Buffer,
        contentType: String
     },
     removed :  {
      type: Boolean,
      default:false
     }
});

const productCategory = mongoose.model("productCategory", productCategorySchema);

module.exports = productCategory;