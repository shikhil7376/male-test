const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  product_name: {
    type: String,
    require: true,
  },
  brand_name: {
    type: String,
    require: true,
  },
  price: {
    type: Number,
    require: true,
  },
  stock_count: {
    type: Number,
    require: true,
  },
  description: {
    type: String,
    require: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'productCategory'
  },
  in_stock: {
    type: Boolean,
    require: true,
  },
  image: [
    {
      data: Buffer,
      contentType: String,
    },
  ],
  is_delete: {
    type: Boolean,
    default: false,
  },
});

const product = mongoose.model("product", productSchema);
module.exports = product;
