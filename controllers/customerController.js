const express=require('express')
const path=require("path")
const {render}=require('ejs')
const Customer = require('../models/customerModel')
const bcrypt=require('bcrypt')
const nodemailer=require('nodemailer')
const UserOTPVerification=require('../models/userOTPVerification')
const { log } = require('console')
const product=require('../models/productModel')
const productCategory = require('../models/productCategory')

// Password hashing function
async function hashPassword(password) {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
}
// Email validation function
function validateEmail(email) {
    // Use a regex or an email validation library here
    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(email);
}

// Password validation function (modify as needed)
function validatePassword(password) {
    // Define your password validation logic here
    return /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=]).{8,}$/.test(password);
}

// load Home
const loadHome=async(req,res)=>{
    try{
        res.render("user/index")
    }catch(error){
        console.log(error.message);
    }
}

//load login
const loadLogin= async(req,res)=>{
    try{
        res.render("user/login")
    }catch(error){
        console.log(error.message);
    }
}
 
// //user valid
 const checkUserValid= async (req,res)=>{
    const {email,password}=req.body
    const customer=await Customer.findOne({email})
    if(!customer){
        return res.render("user/login",{message:"invalid email"})
    }else if(customer.is_block===true){
        res.render("user/login",{messsage:"sorry you are blocked",user:req.session.user})
    }else if(customer.is_varified===true){
    const passwordMatch=await bcrypt.compare(password,customer.password)

      if(!passwordMatch){
        res.render('user/login',{message:"password is incorrect",user:req.session.user})
      }else{
              req.session.user=customer._id
             return res.redirect('/')
      }
    }else{
        res.render('user/login',{message:"you are not verified",user:req.session.user})
    }
}
//  session destroying User logouting
     const userLogouting=(req,res,next)=>{
        try{
            if(req.session.user){
                console.log("first");
                req.session.destroy()
                return res.redirect('/user-Login')
            }else{
                console.log("second");
                return res.redirect('/')
                
            }
        }catch (error){
            console.log(error.message);
        }
     }

 //load register
 const loadRegister=async(req,res,next)=>{
    try{
        res.render("user/register")
    }catch(error){
        console.log(error.message);
    }
 }
// insert user
 const insertUser=async (req,res)=>{
     const{name,email,password,mobile}=req.body
     try{
     if(!validateEmail(email)){
        return res.render("user/register",{message:"invalid email..."})
     }
     if(!validatePassword(password)){
        return res.render("user/register",{message:"invalid password..."})
     }
     const hashedPassword=await hashPassword(password)
     const customer=new Customer({
        name,
        email,
        password:hashedPassword,
        mobile,
     })
     console.log(req.body);
     console.log(customer);
     // save user into database
     const userExist=await Customer.findOne({email})
     if(userExist){
        res.render("user/register",{message:"this account already existed",user:req.session.user})
     }else{
        const userData=await customer.save()
        if(userData){
            //send the verification email
             sendOTPVerificationEmail(userData,res)
             const user_id=userData._id
            res.redirect(`/user/otpVerification?userId=${user_id}`,)
        }else{
            res.render('user/register',{message:"account creation has been failed",user:req.session.user})
        }
     }
     }catch(error){
        console.log(error);
     }
 }


// load otp page

const loadOTPpage=async(req,res)=>{
    try{
        res.render('user/otppage', { id: req.query.userId });
    }catch(error){
        console.log(error.message);
    }
}
// send email models

let transporter = nodemailer.createTransport({
    service: "Gmail",
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    }
});

console.log(process.env.AUTH_EMAIL, process.env.AUTH_PASS);

const sendOTPVerificationEmail = async ({ _id, email }, res) => {
    try {
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

        // Mail options
        const mailOption = {
            from: process.env.AUTH_EMAIL, // Use the correct environment variable
            to: email,
            subject: "Verify Your Email",
            html: `<p>Enter <b>${otp}</b> in the app to verify your email address and complete the verification</p>
                   <p>This code <b>expires in 1 hour</b>.</p>`
        };

        // Hash the OTP
        const saltRounds = 10;
        const hashedOTP = await bcrypt.hash(otp, saltRounds);
        const newOTPVerification = new UserOTPVerification({
            userId: _id,
            otp: hashedOTP,
            createdAt: Date.now(),
            expireAt: Date.now() + 3600000,
        });

        // Save OTP record
        await UserOTPVerification.deleteMany({ userId: _id })

        await newOTPVerification.save();

        // Send email
        await transporter.sendMail(mailOption);

        // Send a single response at the end of the try block

    } catch (error) {
        // Handle errors and send an error response
        console.error(error);
        res.status(500).json({
            status: "FAILED",
            message: error.message
        });
    }
};

const checkOTPValid=async (req,res)=>{
    try{
        const{OTP,ID}=req.body
        // console.log("userID:"+ID);
        if(OTP===''){
            return res.render("user/otppage",{message:"Empty data not allowed",id:ID})
        }
        const OTPRECORD= await UserOTPVerification.findOne({userId:ID})
        if(!OTPRECORD){
            return res.render("user/otppage",{message:"Enter a valid OTP",id:ID})
        }
        const {expiresAt,userId,otp}=OTPRECORD;
        if(expiresAt<Date.now()){
            await UserOTPVerification.deleteOne({userId});
            return res.render("user/otppage",{message:"code expired,please try again..",id:ID})
        }
        console.log(OTP, otp);
        const isValid= await bcrypt.compare(OTP,otp)
        
        if(!isValid){
            return res.render("user/otppage",{message:"invalid otp",id:ID})
        }
        console.log("userId:"+userId);
        console.log(ID,typeof ID);
        await Customer.updateOne({_id:ID},{$set:{is_varified:true}})
        await UserOTPVerification.deleteOne({userId})
        console.log("completed");
        return res.redirect('/user-Login')
    }catch(error){
        console.log(error.message);
    }
}

const loadShop=async(req,res)=>{
    try{
        const products=await product.find({is_delete:false,in_stock:true})
        const Category=await productCategory.find()
        res.render('user/shop',{products,Category})
    }catch (error){
        console.log(error.message);
    }
}








module.exports={
    loadHome,loadLogin,checkUserValid,loadRegister,insertUser,loadOTPpage,checkOTPValid,userLogouting,loadShop
}