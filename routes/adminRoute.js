const express=require('express')
const admin_route = express.Router()
const Auth=require('../middleware/Auth')
const{loadAdminLogin, loginValidation, adminValid,loadDash,displayCustomers,loadCategory, loadAddCategory,addProductcategory,deletecategory,loadProductPage,loadProductCreate,createProduct,productActivate, productDeactivate, UnblockTheUser, blockTheUser,loadProductEditPage,editProduct,adminLogout,loadOrder,updateActionOrder,updateOrderCancel,getreturnRequests,returnRequsetActions,loadCoupons,getAddNewCoupon,addNewCoupon,couponAction,deleteImgDelete,loadEditCategory,loadOfferPage,loadAddOfferPage,createOffer,loadOfferEdit,saveEditOffer,deleteOffer,activeOffer,EditCategory,deleteCategoryImg,getBanner,getAddBanner,addBanner,getSalesReport,loadEditBanner,editBanner,deleteBanner}=require("../controllers/adminController")
const multer = require("multer")
const storage = multer.memoryStorage()
const upload = multer({storage:storage})

// HOME PAGE DASHBOARD
admin_route.get('/dashboard',Auth.adminAuth,loadDash)


// LOGIN
admin_route.get('/login',loadAdminLogin)
admin_route.post('/login',loginValidation,adminValid)
admin_route.post("/logout", adminLogout);

//CUSTOMER MANAGEMENT
admin_route.get('/customers',displayCustomers)
admin_route.get('/customers/Unblock-theUser',UnblockTheUser)
admin_route.get('/customers/block-theUser',blockTheUser)


// CATEGORY MANAGEMENT
admin_route.get('/product/Category-management',Auth.adminAuth,loadCategory)
admin_route.get('/product/add-category',Auth.adminAuth,loadAddCategory)
admin_route.post('/product/add-category',Auth.adminAuth, upload.single('image'), addProductcategory);
admin_route.get("/Category/:id/Delete", Auth.adminAuth, deletecategory);
admin_route.get("/Category/:id/Edit-Category",Auth.adminAuth,loadEditCategory)
admin_route.post("/Category/Edit-Category",Auth.adminAuth,upload.single('image'),EditCategory)
admin_route.get("/category/:id/images-delete",Auth.adminAuth,deleteCategoryImg)

// PRODUCT MANAGEMENT
admin_route.get('/product',loadProductPage)
admin_route.get('/product/create', loadProductCreate)
admin_route.post('/product/create',upload.array('image',3), createProduct)
admin_route.get('/product/:id/Active',productActivate)
admin_route.get('/product/:id/Deactive',productDeactivate)
admin_route.get('/product/:id/Edit',loadProductEditPage)
admin_route.post('/product/Edit',Auth.adminAuth,upload.array('images',3),editProduct)
admin_route.get("/product/:imageId/:id/deleteImg", deleteImgDelete)


// ORDER MANAGEMENT
admin_route.get("/order",Auth.adminAuth,loadOrder)
admin_route.get("/order/action-update",Auth.adminAuth,updateActionOrder)
admin_route.get('/order-cancel',Auth.adminAuth,updateOrderCancel)
admin_route.get('/return-requests',Auth.adminAuth,getreturnRequests)
admin_route.post('/return-requests',Auth.adminAuth,returnRequsetActions)


// COUPON MANAGEMENT
admin_route.get("/coupons",Auth.adminAuth,loadCoupons)
           .get('/new-coupon',Auth.adminAuth,getAddNewCoupon) 
           .post('/new-coupon',Auth.adminAuth,addNewCoupon)
           .patch('/coupons/action/:id',Auth.adminAuth,couponAction)
            
// OFFER MANAGEMENT
  admin_route.get("/Offer",Auth.adminAuth,loadOfferPage)
             .get("/offer/create",Auth.adminAuth,loadAddOfferPage)
             .post("/offer/create",Auth.adminAuth,createOffer)
             .get("/offer/:id/Edit-offer/",Auth.adminAuth,loadOfferEdit)
             .post('/offer/edit-save/',Auth.adminAuth,saveEditOffer)
             .get('/offer/:id/Delete-Offer/',Auth.adminAuth,deleteOffer)
             .get("/offer/:id/active-offer",Auth.adminAuth,activeOffer)

// BANNER MANAGEMENT
admin_route.get('/banner',getBanner)
            .get('/banner/addBanner',getAddBanner)
            .post('/banner/addBanner',Auth.uploadBannerImage,Auth.resizeBannerImages,addBanner)
            .get('/banner/editBanner/:id',Auth.adminAuth,loadEditBanner)
            .post('/banner/editBanner/:id',Auth.adminAuth,editBanner)
            .get('/banner/deleteBanner/:id',Auth.adminAuth,deleteBanner)
 // SALES REPORT
 admin_route.get("/sales-report",getSalesReport)
            .post("/sales-report",getSalesReport)
          
module.exports=admin_route