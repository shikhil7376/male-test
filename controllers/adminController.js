const express=require('express')
const bcrypt=require('bcrypt')
const Customer=require("../models/customerModel")
const productCategory = require('../models/productCategory')
const product = require('../models/productModel')
const Order = require('../models/orderModel')
const Return = require("../models/returnProductModel")
const Coupon = require("../models/couponModel")


const loadAdminLogin=async(req,res)=>{
    try{
        if(!req.session.admin){
            res.render("admin/adminlogin")
        }else{
            res.redirect("admin/dashboard")
        }
    }catch(error){
        console.log(error.message);
    }
}

const loginValidation=async (req,res,next)=>{
    try{
        const{email,password} =req.body
        if(email===""){
            res.render("admin/adminLogin",{message:"Email required"})
        }else if(password===""){
            res.render("admin/adminLogin",{message:"password is required"})
        }else{
            next()
        }
    }catch(error){
        console.log(error.message);
    }
}

const adminValid=async(req,res)=>{
    try {
        const { email, password } = req.body
        const validEmail = await Customer.findOne({ email })


        if (!validEmail || validEmail === "undefined" || validEmail === null || validEmail === "") {

            return res.render("admin/adminLogin", { message: "email is not valid" })

        } else if (!/^\S+@\S+\.\S+$/.test(email) || email === "") {
            res.render("admin/adminLogin", { message: "Invalid Email " })
        } else {
                 const dpassword= validEmail.password
                 const matchPassword=await bcrypt.compare(password,dpassword)
           if(!matchPassword){
            res.render("admin/adminLogin",{message:"password is miss match"})
           }else{
              if(validEmail.is_Admin===true){
                req.session.admin=validEmail._id
                res.redirect("/admin/dashboard")
              }else{
                res.render("admin/adminLogin",{message:"you are not admin"})
              }
           }
        }
    }catch(error){
        console.log(error.message);
    }
}

const loadDash=async (req,res)=>{
    try{
        res.render("admin/dashboard")
    }catch(error){
        console.log(error.message);
    }
}
 
const adminLogout=(req,res)=>{
    try{
        if(req.session.admin){
            req.session.destroy()
            res.redirect("/admin/dashboard")
        }
    }catch(error){
        console.log(error.message);
    }
}




 // CUSTOMERS
 const displayCustomers= async(req,res)=>{
    const {query}=req.query
    console.log(req.query);
    try{
         let users;
         if(query){
            users=await Customer.find({
                name:{ $regex: '.*' + query + '.*' },
                is_Admin:false,
                is_varified:true
            })
            if(users.length>0){
                return res.render("admin/users",{users,query})
            }
         }else{
            users=await Customer.find({is_varified:true,is_Admin:false})
            if(users.length>0){
                return res.render("admin/users",{users,query})
            }
         }
    }catch(error){
        console.log(error.message);
    }
 }

 const UnblockTheUser=async (req,res)=>{
    try{
        const {id} =req.query
        const userUpdated1=await Customer.updateOne({_id:id},{$set:{is_block:false}})
        if(userUpdated1){
            return res.redirect('/admin/customers')
        }
    }catch(error){
        console.log(error.message);
    }
 }

const blockTheUser=async (req,res)=>{
    try{
        const{id}=req.query
        const userUpdated=await Customer.updateOne({_id:id},{$set:{is_block:true}})
        if(userUpdated){
            return res.redirect('/admin/customers')
        }
    }catch (error){
        console.log(error.message);
    }
}


 const loadCategory=async (req,res)=>{
    try{
        const categories=await productCategory.find().sort({_id:-1})
        res.render("admin/productCategory",{categories})
    }catch(error){
        console.log(error.message);
    }
 }

 const loadAddCategory= async (req,res)=>{
    try{
        res.render('admin/addCategory',{message:''})
    }catch(error){
        console.log(error.message);
    }
 }

 const   addProductcategory = async (req, res) => {
    try {
        if (!req.body.categoryName || !req.file) {
            return res.render("admin/addCategory", { message: "Fill all fields..." });
        }

        const exist = await productCategory.findOne({ categoryName: { $regex: new RegExp(req.body.categoryName, 'i') } });


        if (!exist) {
            const category = new productCategory({
                categoryName: req.body.categoryName,
                description: req.body.description,
                image: {
                    data: req.file.buffer,
                    contentType: req.file.mimetype
                }
            });

            await category.save();
            return res.redirect("/admin/product/Category-management");
        } else {
            return res.render('admin/addCategory', { message: "Category already exists" });
        }
    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Internal Server Error");
    }
};

const deletecategory = async (req, res) => {
    try {
        console.log("Delete category function called");
        const { id } = req.params;
        console.log("Category ID:", id);

        const deleteCategory = await productCategory.findByIdAndDelete({ _id: id });
        console.log("Deleted Category:", deleteCategory);

        if (deleteCategory) {
            console.log("Category deleted successfully");
            res.redirect("/admin/product/Category-management");
        } else {
            console.log("Category not found");
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
};

const loadProductPage=async (req,res)=>{
    try{
        const products=await product.find()
        if(products){
            return res.render("admin/products",{products})
        }else{
           console.log("products not get");
        }
    }catch(error){
        console.log(error.message);
    }
}
const loadProductCreate= async (req,res)=>{
       try{
        const Categories= await productCategory.find()
        console.log(Categories);
        res.render("admin/addproduct",{message:"",Categories })
       }catch(error){
        console.log(error.message);
       }
}
const createProduct = async (req, res) => {
    console.log("HAI");
    console.log(req.body);
    const Categories = await productCategory.find()
    const { productName, brandName, price, description, stockCount, category,availability } = req.body;
    
    try {
        // Validate that required fields are provided
        if (!productName || !brandName) {
            return res.render('admin/addproduct', { message: "All fields are required. Please fill in all fields.", Categories});
        }
        let stock
        
        if (availability === 'true') {
            stock = true;
        } else {
            stock = false;
        }
       
        // Create the product
        const pro = new product({
            product_name: productName,
            brand_name: brandName,
            price: price,
            stock_count: stockCount,
            description:description,
            category: category,
            in_stock: stock,
        });

        // Assuming req.files is an array of uploaded image files
        req.files.forEach(file => {
            pro.image.push({ data: file.buffer, contentType: file.mimetype });
        });  console.log("here");
        await pro.save();
     console.log(pro);
    
        if (pro) {
            console.log(" added successfully.");
            return res.redirect("/admin/product")
        }

    } catch (error) {
        //    console.error(error);
        console.log(error.message);
        //    res.status(500).send("Error creating the product.");
    }
}
const productActivate= async (req, res) => {
    try {
        const id = req.params.id
        const change = await product.updateOne({ _id: id }, { $set: { is_delete: false } })
        if (change) {
            return res.redirect('/admin/product')
        }
    } catch (error) {
        console.log(error.message);
    }
}

const productDeactivate=async (req,res)=>{
    try{
        const id=req.params.id
        const change=await product.updateOne({_id:id},{$set:{is_delete:true}})
        if(change){
            return  res.redirect('/admin/product')
        }
    } catch(error){
        console.log(error.message);
    }
}

const loadProductEditPage =async(req,res)=>{
    try{
        const id=req.params.id
        const Product=await product.findOne({_id:id})
        const Categories=await productCategory.find({ categoryName: { $ne: Product.category } })
        res.render("admin/Edit",{message:"",Product,id,Categories})
    }catch(error){
        console.log(error.message);
    }
}

const editProduct = async (req, res) => {
    console.log(">....here>,..");
    console.log(req.body)
    
     const { productName, brandName, price, description, stockCount, category, id, images: requestImages } = req.body;
     try {
         // ...
         const images = req.files;
         const productId = id;
         const data = {
             product_name: productName,
             brand_name: brandName,
             price: price,
             stock_count: stockCount,
             description: description,
             category: category,
         }
 
         const updatedProduct = await product.findByIdAndUpdate(productId, { $set: data }, { new: true })
 
         if (req.files && req.files.length > 0) {
             // Assuming 'req.files' contains the uploaded image files
             req.files.forEach((file) => {
                 updatedProduct.image.push({
                     data: file.buffer,
                     contentType: file.mimetype,
                 });
             });
         }
 
         await updatedProduct.save()
 
         res.redirect('/admin/product')
     } catch (error) {
         console.log(error.message);
     }
 }
 

const deleteImgDelete = async(req,res)=>{
    const id = req.params.id
    const imageId = req.params.imageId
    try{
        const deleteImg = await product.findByIdAndUpdate(
            {_id:id},
            {$pull:{"image":{_id:imageId}}},
            {new:true}
        )

        if(deleteImg){
            return res.redirect(`/admin/product/${req.params.id}/Edit`)
        }
    }catch(error){
        console.log(error.message);
    }
}

const loadOrder = async(req,res) =>{
    const perPage = 8; // Number of order per page 
    const page = req.query.page || 1 // Get the current page from the query parameters (default to page !) 
    const {customer , status} = req.query
    try{
           let ordersQuery = Order.find().populate([{path:'products.product'},{path:'user'}])
           if(customer){
            ordersQuery = ordersQuery.where('user.name').regex(new RegExp(customer, 'i'))
           }
           if(status){
              ordersQuery = ordersQuery.where('status').equals(status)
           }

           const orders = await ordersQuery
            .sort({orderDate:-1}) // sort orderDate in descending order 
            .skip((page - 1)* perPage) // skip orders on previous page
            .limit(perPage) // Limit the number of orders per page 

            const totalOrders = await Order.countDocuments()
            const totalPages = Math.ceil(totalOrders/ perPage)

            res.render("admin/order",{
                 activePage : "orders",
                 orders,
                 totalPages,
                 currentPage: page
            })
    }catch(error){
        console.log(error.message);
    }
}

const updateActionOrder = async(req,res) =>{
    const order = await Order.findById(req.query.orderId)
    const userData = await Customer.findById(order.user)
         try{
          if(req.query.action ==="Delivered"){
            const foundCoupon = await Coupon.findOne({
                isActive:true,minimumPurchaseAmount:{$lte:order.totalAmount}
            }).sort({minimumPurchaseAmount:-1})

            console.log("ggg",foundCoupon);
            if(foundCoupon){
                const couponExists = userData.earnedCoupons.some((coupon)=>coupon.coupon.equals(foundCoupon._id))
                console.log(couponExists);
                if(!couponExists){
                   userData.earnedCoupons.push({coupon: foundCoupon._id})
                }
            }
            await userData.save()
          }
     await Order.updateOne({_id:req.query.orderId},{status : req.query.action})
                
        res.redirect("/admin/order")
            
         }catch(error){
            console.log(error.message);
         }
}

const updateOrderCancel = async(req,res)=>{
    try{
         const foundOrder = await Order.findById(req.query.orderId) 
         for(let i=0;i< foundOrder.products.length ; i++){
            foundOrder.products[i].isCancelled = true
         }
         foundOrder.status = req.query.action 
         await foundOrder.save()
         res.redirect("/admin/order")
    }catch(error){
        console.log(error.message);
    }
}

 const getreturnRequests = async(req,res)=>{
    try{
        const ITEM_PER_PAGE = 4; // no of item to display per page 
        const page = parseInt(req.query.page) || 1
        const totalRequests = await Return.countDocuments()
        const returnRequests = await Return.find()
        .populate([
           {path:'user'},
           {path:'order'},
           {path:'product'},
           {path:'address'} 
        ])
        .skip((page - 1)* ITEM_PER_PAGE) // calculate the number of items to skip
         .limit(ITEM_PER_PAGE)
         const totalPages = Math.ceil(totalRequests / ITEM_PER_PAGE);
    res.render('admin/returns',{
        activePage:"order",
        returnRequests,
        totalPages
    });
    }catch(error){
        console.log(error.message);
    }
 }

 const returnRequsetActions = async(req,res)=>{
    try{
        
           const foundRequest =  await Return.findById(req.body.request)
           const foundOrder = await Order.findById(req.body.order)
           const currentProduct = foundOrder.products.find((product)=>product.product.toString()=== req.body.product.toString())
           console.log(currentProduct);
           if(req.body.action ==="approve"){
            foundRequest.status = "Approved";
            currentProduct.returnRequested = 'Approved'
           } else if(req.body.action ==="reject"){
              foundRequest.status = "Rejected";
              currentProduct.returnRequested = "Rejected"
           }else{
            const transactionData = {
                amount: foundOrder.totalAmount ,
                description: 'Order return.',
                type: 'Credit',
            };
            // currentUser.wallet.transactions.push(transactionData);
            console.log(foundOrder.user);
               const currentUser = await Customer.updateOne({_id:foundOrder.user},{$inc:{"wallet.":foundOrder.totalAmount },$push:{"wallet.transactions":transactionData}})
            console.log(currentUser);
               const EditProduct = await product.findOne({_id:req.body.product})

               const currentStock = EditProduct.stock_count;
               EditProduct.stock_count = currentStock + foundRequest.quantity
               await EditProduct.save()
               
               
                // await 
               foundRequest.status = 'Completed';
               currentProduct.returnRequested = 'Completed'
           }
           await foundRequest.save()
           await foundOrder.save()
           res.redirect('/admin/return-requests')
    }catch(error){
        console.log(error.message);
    }
 }

 const loadCoupons = async (req, res) => {
    try {
        console.log("here");
        // pagination
        const page = req.query.page || 1;
        const pageSize = 8;
        const skip = (page - 1) * pageSize;
        const totalCoupons = await Coupon.countDocuments();
       
        const totalPages = Math.ceil(totalCoupons / pageSize);
        
        let foundCoupons;

        if (req.query.search) {
            foundCoupons = await Coupon.find({
                isActive: req.body.searchQuery === "1" ? true : false
            });
            return res.status(200).json({
                couponDatas: foundCoupons,
            });
        } else {
            foundCoupons = await Coupon.find().skip(skip).limit(pageSize);
            res.render('admin/coupons', {
                activePage: "coupon",
                foundCoupons,
                filtered: req.query.search ? true : false,
                currentPage: page || 1,
                totalPages: totalPages || 1,
            });
        }
    } catch (error) {
        res.render("error/internalError", { error })
    }
};

const getAddNewCoupon = (req,res)=>{
    try{
        console.log("nnn");
        res.render('admin/newCoupons')
    }catch(error){
        res.render("error/internalError", { error:"" })
    }
}

 function generateCouponCode(){
    const codeRegex = /^[A-Z0-9]{5,15}$/;
    let code ='';
    while(!codeRegex.test(code)){
        code = Math.random().toString(36).substring(7)
    }
    return Coupon.findOne({code}).then(existingCoupon=>{
        if(existingCoupon){
            return generateCouponCode()
        }
        return code
    })
 }

const addNewCoupon = async(req,res)=>{
  try{
    const {description,discountType,discountAmount,minimumPurchaseAmount,usageLimit} = req.body
     if(!description || !discountType || !discountAmount || !minimumPurchaseAmount || !usageLimit){
        res.render('admin/newCoupons',{error:"All fields are required"})
     }else{
        if(discountType ==="percentage" && discountAmount>100){
            return res.render('admin/newCoupon',{
                error:"Discount percentage is greater than 100"
            })
        }
        if(description.length <4 || description.length >100){
            return res.render('admin/newCoupons',{
                error:"Description must be between 4 and 100 characters"
            })
        }else{
            const uniqueCode = await generateCouponCode()
            const newCoupon = new Coupon({
                code:uniqueCode,
                discountType,
                description,
                discountAmount,
                minimumPurchaseAmount,
                usageLimit
            })
            await newCoupon.save()
            res.redirect("/admin/coupons")
        }
     }
  }catch(error){
    console.log(error.message);
  }
}

const couponAction = async(req,res)=>{
    try{
       const state = req.body.state ===""
       const couponId = req.params.id;
       await Coupon.findOneAndUpdate(couponId,{$set:{isActive:state}})
       res.redirect('/admin/coupons')
    }catch(error){
        res.render("error/internalError", { error })
    }
}

module.exports={
    loadAdminLogin,loginValidation,adminValid,loadDash,displayCustomers,loadCategory,loadAddCategory,addProductcategory,deletecategory,loadProductPage,loadProductCreate,createProduct,productActivate,productDeactivate,UnblockTheUser,blockTheUser,loadProductEditPage,editProduct,adminLogout,loadOrder,updateActionOrder,updateOrderCancel,getreturnRequests,returnRequsetActions,loadCoupons,getAddNewCoupon,addNewCoupon,couponAction,deleteImgDelete
}