const express=require('express')
const Customer_Route=express.Router()
const Auth=require("../middleware/Auth")

const{loadHome,loadLogin,checkUserValid,loadRegister,insertUser, loadOTPpage, checkOTPValid,userLogouting, loadShop}=require('../controllers/customerController')



//homepage render
Customer_Route.get('/',loadHome)

//login and logout
Customer_Route.get('/user-Login',Auth.userAuth,loadLogin)
Customer_Route.post('/user-Login',checkUserValid)
Customer_Route.post('/user-LogOut',userLogouting)

//signup validation
Customer_Route.get("/register",Auth.userAuth,loadRegister)
Customer_Route.post("/register",insertUser)

// otp verification
Customer_Route.get('/user/otpVerification',Auth.userAuth,loadOTPpage)
Customer_Route.post("/user/otpVerification",checkOTPValid)

// render the shop page
Customer_Route.get('/user/shop',loadShop)

//display the products
Customer_Route.get("user/displayProduct",)












module.exports=Customer_Route