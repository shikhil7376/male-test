const express=require('express')
const admin_route = express.Router()
const Auth=require('../middleware/Auth')
const{loadAdminLogin, loginValidation, adminValid,loadDash,displayCustomers,loadCategory, loadAddCategory,addProductcategory,deletecategory,loadProductPage,loadProductCreate,createProduct,productActivate, productDeactivate, UnblockTheUser, blockTheUser,loadProductEditPage,editProduct,adminLogout}=require("../controllers/adminController")
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
admin_route.post('/product/Edit/:id',editProduct)


module.exports=admin_route