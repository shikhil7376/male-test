const session=require("express-session")
const Customer = require("../models/customerModel");
const multer = require('multer')
const sharp = require('sharp')
//user authenticated or not
const multerStorage = multer.memoryStorage();

const multerFilter = (req,file,cb)=>{
  if(file.mimetype.startsWith('image')){
    cb(null, true);
  }else{
    cb(err,false)
  }
}

const upload = multer({
  storage :multerStorage,
  fileFilter:multerFilter,
}); 

const uploadBannerImage =  upload.single('banner');

const resizeBannerImages = async(req,res,next)=>{
    try{
        if(!req.file) return next();
        req.file.originalname = `Banner-${Date.now()}.jpeg`;
        req.body.banner = req.file.originalname
        await sharp(req.file.buffer)
        .resize(1920,801)
        .toFormat('jpeg')
        .jpeg({quality:90}).toFile(`public/banners/${req.file.originalname}`);
        next();
    }catch(error){
        console.log(error.message);
    }
}


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


// const cropImage = async(req,res,next)=>{
//     try{
//         const files =req.files
//         console.log(files);
//     }catch(error){
//         console.log(error.message);
//     }
// }

module.exports={
    userAuth,adminAuth,logged,checkToBlock,resizeBannerImages,uploadBannerImage,
}