const express = require("express");
const path = require("path");
const Address=require("../models/userAddress")
const Customer = require("../models/customerModel");
const Order = require("../models/orderModel")
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const UserOTPVerification = require("../models/userOTPVerification");
const product = require("../models/productModel");
const productCategory = require("../models/productCategory");
const mongoose = require("mongoose");

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
const loadHome = async (req, res) => {
  try {
    res.render("user/index");
  } catch (error) {
    console.log(error.message);
  }
};

//load login
const loadLogin = async (req, res) => {
  try {
    res.render("user/login");
  } catch (error) {
    console.log(error.message);
  }
};

// //user valid
const checkUserValid = async (req, res) => {
  const { email, password } = req.body;
  const customer = await Customer.findOne({ email });
  if (!customer) {
    return res.render("user/login", { message: "invalid email" });
  } else if (customer.is_block === true) {
    res.render("user/login", {
      messsage: "sorry you are blocked",
      user: req.session.user,
    });
  } else if (customer.is_varified === true) {
    const passwordMatch = await bcrypt.compare(password, customer.password);

    if (!passwordMatch) {
      res.render("user/login", {
        message: "password is incorrect",
        user: req.session.user,
      });
    } else {
      req.session.user = customer._id;
      return res.redirect("/");
    }
  } else {
    res.render("user/login", {
      message: "you are not verified",
      user: req.session.user,
    });
  }
};
//  session destroying User logouting
const userLogouting = (req, res, next) => {
  try {
    if (req.session.user) {
      req.session.destroy();
      return res.redirect("/user-Login");
    } else {
      return res.redirect("/");
    }
  } catch (error) {
    console.log(error.message);
  }
};

//load register
const loadRegister = async (req, res, next) => {
  try {
    res.render("user/register");
  } catch (error) {
    console.log(error.message);
  }
};
// insert user
const insertUser = async (req, res) => {
  const { name, email, password, mobile } = req.body;
  try {
    if (!validateEmail(email)) {
      return res.render("user/register", { message: "invalid email..." });
    }
    if (!validatePassword(password)) {
      return res.render("user/register", { message: "invalid password..." });
    }
    const hashedPassword = await hashPassword(password);
    const customer = new Customer({
      name,
      email,
      password: hashedPassword,
      mobile,
    });
    console.log(req.body);
    console.log(customer);
    // save user into database
    const userExist = await Customer.findOne({ email });
    if (userExist) {
      res.render("user/register", {
        message: "this account already existed",
        user: req.session.user,
      });
    } else {
      const userData = await customer.save();
      if (userData) {
        //send the verification email
        sendOTPVerificationEmail(userData, res);
        const user_id = userData._id;
        res.redirect(`/user/otpVerification?userId=${user_id}`);
      } else {
        res.render("user/register", {
          message: "account creation has been failed",
          user: req.session.user,
        });
      }
    }
  } catch (error) {
    console.log(error);
  }
};

// load otp page

const loadOTPpage = async (req, res) => {
  try {
    res.render("user/otppage", { id: req.query.userId });
  } catch (error) {
    console.log(error.message);
  }
};
// send email models

let transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS,
  },
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
                   <p>This code <b>expires in 1 hour</b>.</p>`,
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
    await UserOTPVerification.deleteMany({ userId: _id });

    await newOTPVerification.save();

    // Send email
    await transporter.sendMail(mailOption);

    // Send a single response at the end of the try block
  } catch (error) {
    // Handle errors and send an error response
    console.error(error);
    res.status(500).json({
      status: "FAILED",
      message: error.message,
    });
  }
};

const checkOTPValid = async (req, res) => {
  try {
    const { OTP, ID } = req.body;
    // console.log("userID:"+ID);
    if (OTP === "") {
      return res.render("user/otppage", {
        message: "Empty data not allowed",
        id: ID,
      });
    }
    const OTPRECORD = await UserOTPVerification.findOne({ userId: ID });
    if (!OTPRECORD) {
      return res.render("user/otppage", {
        message: "Enter a valid OTP",
        id: ID,
      });
    }
    const { expiresAt, userId, otp } = OTPRECORD;
    if (expiresAt < Date.now()) {
      await UserOTPVerification.deleteOne({ userId });
      return res.render("user/otppage", {
        message: "code expired,please try again..",
        id: ID,
      });
    }
    console.log(OTP, otp);
    const isValid = await bcrypt.compare(OTP, otp);

    if (!isValid) {
      return res.render("user/otppage", { message: "invalid otp", id: ID });
    }
    console.log("userId:" + userId);
    console.log(ID, typeof ID);
    await Customer.updateOne({ _id: ID }, { $set: { is_varified: true } });
    await UserOTPVerification.deleteOne({ userId });
    console.log("completed");
    return res.redirect("/user-Login");
  } catch (error) {
    console.log(error.message);
  }
};

const loadShop = async (req, res) => {
  try {
    const products = await product.find({ is_delete: false, in_stock: true });
    const Category = await productCategory.find();
    res.render("user/shop", { products, Category });
  } catch (error) {
    console.log(error.message);
  }
};

const loadcart = async (req, res) => {
  try {
    // Check if the session user ID is available
    if (!req.session.user) {
      // Handle the case where the session user ID is not found
      return res.status(404).send("Session User ID not found.");
    }

    const customer = await Customer.findById(req.session.user).populate(
      "cart.product"
    );
    if (!customer) {
      // Handle the case where the customer is not found
      return res.status(404).send("Customer not found.");
    }

    const totalCost = customer.cart.reduce(
      (total, item) => total + item.total,
      0
    );
    res.render("user/cart", { customer, totalCost });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};  

const addToCart = async (req, res) => {
  try {
    const productId = req.params.productId;
    
    // Check if the product exists
    const productInfo = await product.findById(productId);
    if (!productInfo) {
      return res.status(404).send("Product not found");
    }

    // Check if the user is authenticated
    if (!req.session.user) {
      return res.status(401).send("User not authenticated");
    }

    // Find the customer and update the cart
    const customer = await Customer.findById(req.session.user);

    // Check if the product already exists in the cart
    const existingItem = customer.cart.find((item) =>
      item.product.equals(productId)
    );

    // Check if adding one more quantity exceeds the stock
    if (
      existingItem 
    ) {
      existingItem.quantity += 1;
      existingItem.total = existingItem.quantity * productInfo.price; // Update the total price
    } else if (!existingItem && productInfo.stock_count > 0) {
      // If the product is not in the cart, and there's stock available
      customer.cart.push({
        product: productId,
        quantity: 1,
        total: productInfo.price,
      });
    } else {
      // Handle the case where adding more quantity exceeds stock
      return res.status(400).send("Cannot add more quantity. Stock limit reached.");
    }

    // Explicitly mark cart as modified
    customer.markModified("cart");

    // Save the updated customer data
    await customer.save();

    // Redirect to the cart page after successful update
    res.redirect("/user/cart");
  } catch (error) {
    console.error(error.message);
    // Handle errors and redirect to an error page or display an error message
    res.status(500).send("Internal Server Error");
  }
};


const removeFromCart = async (req, res) => {
  try {
    const productId = req.params.productId;
    const customer = await Customer.findById(req.session.user);
    // Remove the item from the cart array
    customer.cart = customer.cart.filter(
      (item) => !item.product.equals(productId)
    );
    // Explicitly mark cart as modified
    customer.markModified("cart");

    // Save the updated customer data
    await customer.save();

    console.log("Product removed successfully.");

    // Redirect to the cart page after successful removal
    res.redirect("/user/cart");
  } catch (error) {
    console.error(error.message);
    // Handle errors and redirect to an error page or display an error message
    res.status(500).send("Internal Server Error");
  }
};

const changeQuantity = async (req, res) => {
  try {
    const productId = req.params.productId;
    const quantityChange = parseInt(req.params.quantityChange);

    // Check if the user is authenticated
    if (!req.session.user) {
      return res.status(401).send("User not authenticated");
    }

    // Find the customer and update the cart
    const customer = await Customer.findById(req.session.user).populate(
      "cart.product"
    );
    
  


    // Find the item in the cart
    const cartItem = customer.cart.find((item) =>
      item.product.equals(productId)
    );
    if (
      cartItem &&
      cartItem.product &&
      typeof cartItem.product.price === "number" 
    ) {
      // Update the quantity
      cartItem.quantity += quantityChange;

      // Ensure quantity doesn't go below 1
      if (cartItem.quantity < 1) {
        cartItem.quantity = 1;
      }

      // Update the total price
      cartItem.total = cartItem.quantity * cartItem.product.price;

      // Explicitly mark cart as modified
      customer.markModified("cart");

      // Save the updated customer data
      await customer.save();

      // Redirect to the cart page after successful update
      // return res.redirect("/user/cart");
      return res.status(200).send({ message: "success" });
    } else {
      // Log an error if product or price is not valid
      console.error("Invalid product or price:", cartItem.product);
      return res.status(500).send("Invalid product or price");
    }
  } catch (error) {
    console.error("Error changing quantity:", error.message);
    // Handle errors and send an appropriate response
    return res.status(500).send("Internal Server Error");
  }
};



const loadprofile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.session.user);
    const addresses = await Address.find({User:req.session.user})
    if (!customer) {
      return res.status(404).send("customer not found");
    }
    res.render("user/userprofile", { customer,addresses });
  } catch (error) {
    console.log(error.message);
  }
};

const loadChangePassword= async(req,res)=>{
  try{
    const customer=await Customer.findById(req.session.user)
    if(!customer){
      return res.status(404).send("customer not found")
    }
    res.render("user/changepassword", { userId: customer._id })
  }catch(error){  
    console.log(error.message);
  }
}

const changePassword=async (req,res)=>{
  try{
    const customer=await Customer.findById(req.session.user)
    const{userId,oldPassword,newPassword,confirmPassword}=req.body
    if(newPassword!==confirmPassword){
      return res.render("user/changepassword",{message:'New password',userId: customer._id})
    }
    const user=await Customer.findById(userId)
    if(!user){
      return res.render("user/changepassword",{message: 'User not found' ,userId: customer._id});
    }
    const isPasswordValid= await bcrypt.compare(oldPassword,user.password)
    if(!isPasswordValid){
      return res.render("user/changepassword", {message: 'Incorrect old password',userId: customer._id });
    }
    const hashedpassword=await hashPassword(newPassword)
     user.password=hashedpassword
     await user.save()
     return res.render("user/changepassword", { message:'Password changed successfully',userId: customer._id});
  }catch (error){
        console.log(error.message);
  }
}

const loadAddaddress = async (req,res) =>{
  try{
    res.render("user/addAddress")
  }catch(error){
    console.log(error.message);
  }
}

const addAddress = async (req,res) =>{
  try{
    const {pincode,state,city,building,area} = req.body
        const newAddress= new Address({
          User:req.session.user,
          pincode,
          state,
          city,
          building,
          area,
        })  
        await newAddress.save()
        res.redirect('/user/profile')
  }catch(error){
    console.log(error.message);
  } 
}
const deleteAddAddress = async (req,res) =>{
  try{
    await Address.findByIdAndDelete(req.query.addressId)
     res.redirect('/user/profile')
  } catch(error){
    console.log(error.message);
  }
}
 
const loadEditAddress= async (req,res) =>{
  try{
    const address= await Address.findById(req.query.addressId)
    res.render("user/editAddress",{address})
  }catch(error){
    console.log(error.message);
  }
}

const EditAddress = async (req,res)=>{
  try{
     const address= await Address.updateOne({_id:req.body.addressId},{$set:{
      pincode:req.body.pincode,
      state:req.body.state,
      city:req.body.city,
      building:req.body.building,
      area:req.body.area
     }})
     console.log(req.body);
     res.redirect('/user/profile')
  }catch(error){
    console.log(error.message);   
  }
}


const loadCheckout = async (req,res) =>{
  try{
    const currentUser= await Customer.findById(req.session.user)
    if(currentUser.is_varified){
      const defaultAddress = await Address.findOne({User:req.session.user,default:true})
       await currentUser.populate('cart.product')
       await currentUser.populate('cart.product.category')
       const cartProducts= currentUser.cart
       const grandTotal= cartProducts.reduce((total,element)=>{
          return total + (element.quantity * element.product.price)
       },0)

       let insufficientStockProduct;
       cartProducts.forEach((cartProduct)=>{
        if(cartProduct.product.stock < cartProduct.quantity){
          insufficientStockProduct = cartProduct._id
        }
       })
       if(!insufficientStockProduct){
        res.render("user/checkout",{
          currentUser,
          cartProducts,
          currentAddress:defaultAddress,
          grandTotal,
          discount:0,
          error:''
        })
       }else{
        res.render("user/cart")
       }
    }
  }catch(error){
    console.log(error.message);
  }
}

  const placeOrder = async (req,res,next) =>{
    try{
      const currentUser = await Customer.findById(req.session.user)
      await currentUser.populate('cart.product')
      const deliveryAddress = await Address.findOne({user:req.session.user,default:true})
      const grandTotal = currentUser.cart.reduce((total,element)=>{
        return total + (element.quantity * element.product.price)
      },0)
      const orderedProducts = currentUser.cart.map((item)=>{
        return {
          product: item.product._id,
          quantity: item.quantity
        }
      })
       let neworder = new Order({
            user:req.session.user,
            products:orderedProducts,
            totalAmount:grandTotal - req.body.discount + 5,
            paymentMethod: req.body.method,
            deliveryAddress
       })

       if(req.body.method ==='cod'){
        await neworder.save()
       }else{
          if(currentUser.wallet.balance < grandTotal + 5){
            return res.render("user/checkout",{
              currentUser,
              cartProducts:currentUser.cart,
              currentAddress: deliveryAddress,
              discount:0,
              grandTotal,
              error:"Insufficient wallet balance"
            })
          }else{
            await neworder.save()
            currentUser.wallet.balance -= (grandTotal + 5)
            const transactionData = {
              amount : grandTotal + 5,
              description: 'order placed',
              type : 'Debit',
            }
            currentUser.wallet.transaction.push(transactionData)
          }
       }
       // stock update
       currentUser.cart.forEach(async (item)=>{
        const foundProduct = await product.findById(item.product._id)
        foundProduct.stock -=item.quantity
        await foundProduct.save()
       })

    }catch(error){
      console.log(error.message);
    }
  }
  
const getOrders = async (req,res,next) =>{
  try{
    await updateOrderStatus();

    const currentUser = await Customer.findById(req.session.user)
    const orders = await Order.aggregate([
      {$match:{user:new mongoose.Types.ObjectId(req.session.user)}},
      {$unwind: "$products"},
      {
        $lookup : {
          from : "products",
          localField:"products.product",
          foreignField: "_id",
          as:"orderedProducts"
        }
      },
      {$sort :{orderDate:-1}}
    ])
    console.log(orders);
    res.render("user/orders",{
      currentUser,
      orders,
      activePage: 'Profile'
    })
  }catch(error){
    console.log(error.message);
  }
}

const updateOrderStatus = async () =>{
  try{
     const twoDaysAgo = new Date()
     twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

     // update orders from Processing to shipped after two days
     await Order.updateMany(
      {
          status: 'Processing',
          deliveryDate:{$lte: twoDaysAgo} 
      },
      {$set:{status:'Shipped'}}
     )

     const currentDate = new Date()

     // Update orders from Shipped to delivered if the deliveryDate is in the past
        await Order.updateMany(
          {
            status:'Shipped',
            deliveryDate:{$lte: currentDate}
          },
          {$set:{status: 'Delivered'}}
        )
  }catch(error){
    console.log(error.message);
  }
}


module.exports = {
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
};
