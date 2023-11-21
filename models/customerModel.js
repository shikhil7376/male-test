const mongoose=require('mongoose')

const transactionSchema = new mongoose.Schema({
   amount:{
    type: Number,
    required: true
   },
   description:{
    type: String,
    required:true
   },
   type: {
    type: String,
    enum:['Credit','Debit'],
    required : true
   },
   timestamp :{
    type: Date,
    default: 0
   }
})



// const walletSchema =



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
   }],
   earnedCoupons:[
      {
         coupon:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Coupon'
         },
         isUsed:{
            type:Boolean,
            default:false
         }
      }
   ],
   wallet : {
      balance: {
         type: Number,
         default:0
      },
      transactions : [transactionSchema]
     }
})  



   

const Customer=mongoose.model('Customer',CustomerSchema)
module.exports=Customer;