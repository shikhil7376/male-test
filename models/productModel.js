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
     type:mongoose.Schema.Types.ObjectId,
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
   offer:{
    type:mongoose.Schema.Types.ObjectId,
     ref:"Offer"
   },
   offerPrice:{
       type:Number,
       default:0
   },
   categoryOfferPrice:{
     type:Number,
     default:0
   },
    
   originalPrice:{
    type:Number
   }
});

const product = mongoose.model("product", productSchema);
module.exports = product;
