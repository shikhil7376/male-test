const express=require('express')
const admin_route = express.Router()
const Auth=require('../middleware/Auth')
const{loadAdminLogin, loginValidation, adminValid,loadDash,displayCustomers,loadCategory, loadAddCategory,addProductcategory,deletecategory,loadProductPage,loadProductCreate,createProduct,productActivate, productDeactivate, UnblockTheUser, blockTheUser,loadProductEditPage,editProduct,adminLogout,loadOrder,updateActionOrder,updateOrderCancel,getreturnRequests,returnRequsetActions,loadCoupons,getAddNewCoupon,addNewCoupon,couponAction,deleteImgDelete,loadOffer,addOffer,updateOffer }=require("../controllers/adminController")
const multer = require("multer")
const storage = multer.memoryStorage()
const upload = multer({storage:storage})


admin_route.get('/dashboard',Auth.adminAuth,loadDash)
admin_route.get('/login',loadAdminLogin)
admin_route.post('/login',loginValidation,adminValid)
admin_route.post("/logout", adminLogout);

admin_route.get('/customers',displayCustomers)
admin_route.get('/customers/Unblock-theUser',UnblockTheUser)
admin_route.get('/customers/block-theUser',blockTheUser)

admin_route.get('/product/Category-management',Auth.adminAuth,loadCategory)
admin_route.get('/product/add-category',Auth.adminAuth,loadAddCategory)
admin_route.post('/product/add-category',Auth.adminAuth, upload.single('image'), addProductcategory);
admin_route.get("/Category/:id/Delete", Auth.adminAuth, deletecategory);


admin_route.get('/product',loadProductPage)
admin_route.get('/product/create', loadProductCreate)
admin_route.post('/product/create',upload.array('image',3), createProduct)
admin_route.get('/product/:id/Active',productActivate)
admin_route.get('/product/:id/Deactive',productDeactivate)


admin_route.get('/product/:id/Edit',loadProductEditPage)
admin_route.post('/product/:id/Edit',upload.array('images',3),editProduct)
admin_route.get("/product/:imageId/:id/deleteImg", deleteImgDelete)


admin_route.get("/order",Auth.adminAuth,loadOrder)
admin_route.get("/order/action-update",Auth.adminAuth,updateActionOrder)
admin_route.get('/order-cancel',Auth.adminAuth,updateOrderCancel)
admin_route.get('/return-requests',Auth.adminAuth,getreturnRequests)
admin_route.post('/return-requests',Auth.adminAuth,returnRequsetActions)

admin_route.get("/coupons",Auth.adminAuth,loadCoupons)
           .get('/new-coupon',Auth.adminAuth,getAddNewCoupon) 
           .post('/new-coupon',Auth.adminAuth,addNewCoupon)
           .patch('/coupons/action/:id',Auth.adminAuth,couponAction)

admin_route.get('/offer',Auth.adminAuth,loadOffer)
admin_route.post('/addOffer',Auth.adminAuth,addOffer)
admin_route.post('/editOffer', Auth.adminAuth, updateOffer);

module.exports=admin_route