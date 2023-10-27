const mongoose=require("mongoose")

const AddressSchema=new mongoose.Schema({
    User:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Customer",
        require:true
    },
 pincode:{
    type:Number,
    required:true,
 },
 state:{
  type:String,
  required:true,    
 },
 city:{
    type:String,
    required:true
 }, 
 building:{
    type:String,
    required:true
 },
 area:{
    type:String,
    required:true
 },
 default:{
    type:Boolean,
    default:false
 },
 softDeleted:{
    type:Boolean,
    default:false
 },

})

const Address=mongoose.model('Address',AddressSchema)

module.exports=Address