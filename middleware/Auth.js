const session=require("express-session")
const Customer = require("../models/customerModel");
//user authenticated or not
const userAuth=(req,res,next)=>{
    try{
        if(!req.session.user){
            next()
        }else{
            res.redirect("/")
        }
    }catch(error){
        console.log(error.message);
    }
}

const logged=(req,res,next)=>{
    try{
        if(req.session.user){
            next()
        }else{
            res.redirect("/")
        }
    }catch(error){
        console.log(error.message);
    }
}
 
const checkToBlock=async (req,res,next)=>{
    const currentUser=await Customer.findById(req.session.user)
    if(currentUser && currentUser. is_block===true){
        console.log("here");
        req.session.user=null
       return res.redirect("/user-Login")
    }
    next()
}


// admin authentication

const adminAuth=(req,res,next)=>{
    try{
        if(req.session.admin){
            next()
        }else{
            res.redirect("/admin/login")
        }
    }catch(error){
        console.log(error.message);
    }
}



module.exports={
    userAuth,adminAuth,logged,checkToBlock
}