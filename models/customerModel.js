const mongoose=require('mongoose')

const CustomerSchema=new mongoose.Schema({
   name:{
    type:String,
    require:true
   },
   mobile:{
    type:String,
    required:true
   },
   email:{
    type:String,
    required:true,
   },
   password: {

      type: String,
    required: true,
   },
   is_varified:{
      type:Boolean,
      default:false
   },
   is_block:{
      type:Boolean,
      default:false
   },
   is_Admin:{
      type:Boolean,
      default:false
   },
   image:{
      data:Buffer,
      contentType:String
   },
   cart:[{
      product:{
         type:mongoose.Schema.Types.ObjectId,
         
         ref:'product'
      },
      quantity:{
         type:Number,
         default:0
      },
      total:{
         type:Number,
         default:0
      }
   }]
})  

const Customer=mongoose.model('Customer',CustomerSchema)
module.exports=Customer;