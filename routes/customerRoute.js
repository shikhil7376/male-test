const express=require('express')
const Customer_Route=express.Router()
const Auth=require("../middleware/Auth")

const{
    loadHome,
    loadLogin,
    checkUserValid,
    loadRegister,
    insertUser,
    loadOTPpage, 
    checkOTPValid,
    userLogouting, 
    loadShop,
    loadcart,
    addToCart,
    removeFromCart,
    changeQuantity,
    loadprofile, 
    loadChangePassword, 
    changePassword,
    loadAddaddress,
    addAddress,
    deleteAddAddress,
    loadEditAddress,
    EditAddress,
    loadCheckout,
    placeOrder,
   getOrders
}=require('../controllers/customerController')





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

// CART AND DELETE DISPLAY   
Customer_Route.get("/user/cart",Auth.logged,loadcart) 
Customer_Route.post('/add-to-cart/:productId',)

//user profile 
Customer_Route.get('/user/profile',Auth.logged,loadprofile)
Customer_Route.get('/user/profile/changepassword',Auth.logged,loadChangePassword)
Customer_Route.post('/user/profile/changepassword',Auth.logged,changePassword)

// user Address
Customer_Route.get('/user/profile/add-address',Auth.checkToBlock,Auth.logged,loadAddaddress)
Customer_Route.post('/user/profile/add-address',Auth.checkToBlock,Auth.logged,addAddress)
Customer_Route.get('/user/profile/delete-address',Auth.checkToBlock,Auth.logged,deleteAddAddress)
Customer_Route.get('/user/profile/edit-address',Auth.checkToBlock,Auth.logged,loadEditAddress)
Customer_Route.post('/user/profile/edit-address',Auth.checkToBlock,Auth.logged,EditAddress)

// CART AND DELETE DISPLAY  
Customer_Route.get("/user/cart",Auth.logged,loadcart) 
Customer_Route.post('/add-to-cart/:productId', addToCart)
Customer_Route.post('/remove-from-cart/:productId', removeFromCart);
Customer_Route.post('/change-quantity/:productId/:quantityChange', changeQuantity);

//checkout
Customer_Route.get("/user/checkout",Auth.checkToBlock,Auth.logged,loadCheckout)
Customer_Route.post("/user/checkout",Auth.checkToBlock,Auth.logged,placeOrder)

Customer_Route.get("/orders",Auth.checkToBlock,Auth.logged,getOrders)
module.exports=Customer_Route