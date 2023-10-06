const session=require("express-session")

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
    userAuth,adminAuth
}