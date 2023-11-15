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
    updateCartItem,
    loadprofile, 
    loadChangePassword, 
    changePassword,
    loadAddaddress,
    addAddress,
    deleteAddAddress,
    loadEditAddress,
    EditAddress,
    getAddresses,
    loadCheckout,
    placeOrder,
   getOrders,
   getSingleProduct,
   changeDefaultAddress,
   loadOrderSuccess,
   getWallet ,
   saveRzpOrder,
   cancelOrder,
   getReturnProductForm ,
   requestReturnProduct,

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
Customer_Route.get('/shop/:page', loadShop);

Customer_Route.get("/single/:id",Auth.checkToBlock,getSingleProduct)

//display the products
Customer_Route.get("user/displayProduct",)

// CART AND DELETE DISPLAY   
Customer_Route.get("/cart",Auth.logged,loadcart) 
Customer_Route.post('/add-to-cart/',Auth.logged,Auth.checkToBlock,addToCart)
Customer_Route.delete('/remove-from-cart/:cartItemId', Auth.logged, removeFromCart);
Customer_Route.put('/update-cart-item/:cartItemId/:action', Auth.logged, updateCartItem);


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

Customer_Route.get('/change-address',Auth.logged,Auth.checkToBlock,getAddresses)
Customer_Route.post('/change-address',Auth.logged,Auth.checkToBlock, changeDefaultAddress)
//checkout
Customer_Route.get("/user/checkout",Auth.checkToBlock,Auth.logged,loadCheckout)
Customer_Route.post("/user/checkout",Auth.checkToBlock,Auth.logged,placeOrder)
Customer_Route.post("/save-rzporder",Auth.checkToBlock,Auth.logged, saveRzpOrder)
Customer_Route.get("/order-successfull",Auth.logged,Auth.checkToBlock,loadOrderSuccess )
                                                                
Customer_Route.get("/orders",Auth.checkToBlock,Auth.logged,getOrders)
Customer_Route.get("/wallet",Auth.checkToBlock,Auth.logged,getWallet)

Customer_Route.post("/cancel-order",Auth.checkToBlock,Auth.logged,cancelOrder)

Customer_Route.get("/return-product",Auth.checkToBlock,Auth.logged,getReturnProductForm )
Customer_Route.post("/return-product",Auth.checkToBlock,Auth.logged,requestReturnProduct)

module.exports=Customer_Route