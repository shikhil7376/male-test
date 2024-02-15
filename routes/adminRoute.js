const express=require('express')
const admin_route = express.Router()
const Auth=require('../middleware/Auth')
const{loadAdminLogin, loginValidation, adminValid,loadDash,displayCustomers,loadCategory, loadAddCategory,addProductcategory,deletecategory,loadProductPage,loadProductCreate,createProduct,productActivate, productDeactivate, UnblockTheUser, blockTheUser,loadProductEditPage,editProduct,adminLogout,loadOrder,updateActionOrder,updateOrderCancel,getreturnRequests,returnRequsetActions,loadCoupons,getAddNewCoupon,addNewCoupon,couponAction,deleteImgDelete,loadEditCategory,loadOfferPage,loadAddOfferPage,createOffer,loadOfferEdit,saveEditOffer,deleteOffer,activeOffer,EditCategory,deleteCategoryImg,getBanner,getAddBanner,addBanner,getSalesReport,loadEditBanner,editBanner,deleteBanner,}=require("../controllers/adminController")
const multer = require("multer")
const storage = multer.memoryStorage()
const upload = multer({storage:storage})

// HOME PAGE DASHBOARD
admin_route.get('/dashboard',Auth.adminAuth,loadDash)


// LOGIN
admin_route.get('/login',loadAdminLogin)
admin_route.post('/login',loginValidation,adminValid)
admin_route.post("/logout",Auth.adminAuth, adminLogout);


//CUSTOMER MANAGEMENT
admin_route.get('/customers',Auth.adminAuth,displayCustomers)
admin_route.get('/customers/Unblock-theUser',Auth.adminAuth,UnblockTheUser)
admin_route.get('/customers/block-theUser',Auth.adminAuth,blockTheUser)


// CATEGORY MANAGEMENT
admin_route.get('/product/Category-management',Auth.adminAuth,loadCategory)
admin_route.get('/product/add-category',Auth.adminAuth,loadAddCategory)
admin_route.post('/product/add-category',Auth.adminAuth, upload.single('image'), addProductcategory);
admin_route.get("/Category/:id/Delete", Auth.adminAuth, deletecategory);
admin_route.get("/Category/:id/Edit-Category",Auth.adminAuth,loadEditCategory)
admin_route.post("/Category/Edit-Category",Auth.adminAuth,upload.single('image'),EditCategory)
admin_route.get("/category/:id/images-delete",Auth.adminAuth,deleteCategoryImg)

// PRODUCT MANAGEMENT
admin_route.get('/product',Auth.adminAuth,loadProductPage)
           .get('/product/create',Auth.adminAuth, loadProductCreate)
           .post('/product/create',Auth.adminAuth,upload.array('image',3), createProduct)
           .get('/product/:id/Active',Auth.adminAuth,productActivate)
           .get('/product/:id/Deactive',Auth.adminAuth,productDeactivate)
           .get('/product/:id/Edit',Auth.adminAuth,loadProductEditPage)
           .post('/product/Edit',Auth.adminAuth,upload.array('images',3),editProduct)
           .get("/product/:imageId/:id/deleteImg",Auth.adminAuth,deleteImgDelete)


// ORDER MANAGEMENT
admin_route.get("/order",Auth.adminAuth,loadOrder)
           .get("/order/action-update",Auth.adminAuth,updateActionOrder)
           .get('/order-cancel',Auth.adminAuth,updateOrderCancel)
           .get('/return-requests',Auth.adminAuth,getreturnRequests)
           .post('/return-requests',Auth.adminAuth,returnRequsetActions)


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
admin_route.get('/banner',Auth.adminAuth,getBanner)
            .get('/banner/addBanner',Auth.adminAuth,getAddBanner)
            .post('/banner/addBanner',Auth.uploadBannerImage,Auth.resizeBannerImages,addBanner)
            .get('/banner/editBanner/:id',Auth.adminAuth,loadEditBanner)
            .post('/banner/editBanner/:id',Auth.uploadBannerImage,Auth.resizeBannerImages,editBanner)
            .get('/banner/deleteBanner/:id',Auth.adminAuth,deleteBanner)

 // SALES REPORT
 admin_route.get("/sales-report",Auth.adminAuth,getSalesReport)
            .post("/sales-report",Auth.adminAuth,getSalesReport)

      
module.exports=admin_route