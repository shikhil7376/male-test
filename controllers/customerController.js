const express = require("express");
const path = require("path");
const Address = require("../models/userAddress");
const Customer = require("../models/customerModel");
const Order = require("../models/orderModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const UserOTPVerification = require("../models/userOTPVerification");
const product = require("../models/productModel");
const productCategory = require("../models/productCategory");
const Return = require("../models/returnProductModel")
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const razorpayConfig = require("./utils/razorpayConfig");
const sharp = require("sharp");
const { log } = require("console");
const { ok } = require("assert");

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

const totalSum = async function(id){
  try {
    const userData = await Customer.findById(id);

    if (!userData || Object.keys(userData).length === 0) {
      // Handle the case where userData is null or empty
      return 0;
    }

    const cart = userData.cart;

    if(cart.length !== 0){
      // Move the console.log(cart) here
      console.log(cart);

      const totalSum = cart.reduce((acc, item) => {
        return acc + item.total;
      }, 0);

      return totalSum;
    } else {
      return 0;
    }
  } catch (error) {
    // Handle any potential errors during the async operation
    console.error("Error fetching user data:", error);
    return 0;
  }
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

const resendOtp = async(req,res)=>{
  try{
     const {userId} = req.body
     const userDate = await Customer.findById(userId)
     await sendOTPVerificationEmail(userDate)
     if(userDate){
      return res.redirect(`/user/otpVerification?userId=${userId}`)
     }
  }catch(error){
    console.log(error.message);
  }
}

const loadShop = async (req, res) => {
  try {
    const page = parseInt(req.params.page) || 1;
    const pageSize = 3;
    const skip = (page - 1) * pageSize;

    const totalProducts = await product.countDocuments({
      is_delete: false,
    });
    const totalPages = Math.ceil(totalProducts / pageSize);
    const foundProducts = await product
      .find({ is_delete: false })
      .populate("category")
      .skip(skip)
      .limit(pageSize);
    const foundCategories = await productCategory.find({ removed: false });
    res.render("user/shop", {
      productDatas: foundProducts,
      currentUser: await Customer.findById(req.session.user),
      categoryBased: false,
      categoryDatas: foundCategories,
      category: { name: "shop All", id: "" },
      activePage: "Shop",
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const getSingleProduct = async (req, res) => {
  try {
    const currentUser = await Customer.findById(req.session.user);
    const ProductId = req.params.id;
    const foundProduct = await product.findById(ProductId);
    res.render("user/single", {
      productData: foundProduct,
      currentUser: await Customer.findById(req.session.user),
      activepage: "Shop",
    });
  } catch (error) {
    console.log(error.message);
  }
};

const loadcart = async (req, res) => {
  try {
    const currentUser = await Customer.findById(req.session.user);
    console.log(currentUser);
    if (currentUser.is_varified) {
      await currentUser.populate("cart.product");
      await currentUser.populate("cart.product.category");
      // Use Promise.all to wait for all asynchronous operations
      await Promise.all(
        currentUser.cart.map(async (cartItem) => {
          const resizedImageBuffer = await sharp(cartItem.product.image[0].data)
            .resize({ width: 60, height: 60 }) // Adjust dimensions as needed
            .toBuffer();

          cartItem.product.image[0].data = resizedImageBuffer;
        })
      );

      const cartProducts = currentUser.cart;
      const grandTotal = cartProducts.reduce((total, element) => {
        return total + element.quantity * element.product.price;
      }, 0);

      res.render("user/cart", {
        currentUser,
        cartProducts,
        grandTotal,
        insufficientStockProduct: "",
        activePage: "Cart",
      });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const addToCart = async (req, res) => {
  try {
    const currentUser = await Customer.findById(req.session.user);
    const { Product, hiddenQuantity, ProductPrice } = req.body;
    const existingCartItem = currentUser.cart.find((item) => {
      return item.product && item.product.toString() === Product;
    });

    if (existingCartItem) {
      existingCartItem.quantity += parseInt(hiddenQuantity);
    } else {
      const cartItem = {
        product: Product,
        quantity: parseInt(hiddenQuantity),
        total: parseInt(ProductPrice),
      };
      currentUser.cart.push(cartItem);
    }
    await currentUser.save();
    res.redirect("/cart"); // Assuming you want to redirect to the cart page after adding the item.
  } catch (error) {
    console.log(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const updateCartItem = async (req, res) => {
  const { cartItemId, action } = req.params;
  try {
    const id = req.session.user
    const currentUser = await Customer.findById(id);
    await currentUser.populate("cart.product");

    if (!currentUser) {
      return res.status(404).send("User not found");
    }

    const cartItem = currentUser.cart.find(
      (item) => item._id.toString() === cartItemId
    );
    if (!cartItem) {
      return res.status(404).send("Cart item not found");
    }

    // Perform increment or decrement based on the action
    if (action === "increment") {
      // Check if quantity doesn't exceed stock and increment
      if (cartItem.quantity < cartItem.product.stock_count) {
        cartItem.quantity += 1;
        // Decrease stock count from the backend
        // cartItem.product.stock_count -= 1;
      }
    } else if (action === "decrement") {
      // Check if quantity is greater than 1 and decrement
      if (cartItem.quantity > 1) {
        cartItem.quantity -= 1;
        // Increase stock count in the backend
        // cartItem.product.stock_count += 1;
      }
    }

    cartItem.total = cartItem.product.price * cartItem.quantity;
    
    

    await currentUser.save();
    const totSum = await totalSum(id)
    console.log(totSum)
    res.status(200).json({ message: "Cart item updated successfully",totalSum:cartItem.total,totalCartSum:totSum });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};





const removeFromCart = async (req, res) => {
  try {
    const currentUser = await Customer.findById(req.session.user);

    if (!currentUser) {
      return res.status(404).send("User not found");
    }

    const { cartItemId } = req.params;

    const cartItemIndex = currentUser.cart.findIndex(
      (item) => item._id.toString() === cartItemId
    );

    if (cartItemIndex === -1) {
      return res.status(404).send("Cart item not found");
    }

    const removedCartItem = currentUser.cart.splice(cartItemIndex, 1)[0];

    // Increase stock count
    removedCartItem.product.stock_count += removedCartItem.quantity;

    await currentUser.save();
    res.status(200).json({ message: "Item removed from cart successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const loadprofile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.session.user);
    const addresses = await Address.find({ User: req.session.user });
    if (!customer) {
      return res.status(404).send("customer not found");
    }
    res.render("user/userprofile", { customer, addresses });
  } catch (error) {
    console.log(error.message);
  }
};

const loadChangePassword = async (req, res) => {
  try {
    const customer = await Customer.findById(req.session.user);
    if (!customer) {
      return res.status(404).send("customer not found");
    }
    res.render("user/changepassword", { userId: customer._id });
  } catch (error) {
    console.log(error.message);
  }
};

const changePassword = async (req, res) => {
  try {
    const customer = await Customer.findById(req.session.user);
    const { userId, oldPassword, newPassword, confirmPassword } = req.body;
    if (newPassword !== confirmPassword) {
      return res.render("user/changepassword", {
        message: "New password",
        userId: customer._id,
      });
    }
    const user = await Customer.findById(userId);
    if (!user) {
      return res.render("user/changepassword", {
        message: "User not found",
        userId: customer._id,
      });
    }
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.render("user/changepassword", {
        message: "Incorrect old password",
        userId: customer._id,
      });
    }
    const hashedpassword = await hashPassword(newPassword);
    user.password = hashedpassword;
    await user.save();
    return res.render("user/changepassword", {
      message: "Password changed successfully",
      userId: customer._id,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const loadAddaddress = async (req, res) => {
  try {
    res.render("user/addAddress");
  } catch (error) {
    console.log(error.message);
  }
};

const addAddress = async (req, res) => {
  try {
    const { pincode, state, city, building, area } = req.body;
    const newAddress = new Address({
      User: req.session.user,
      pincode,
      state,
      city,
      building,
      area,
    });
    await newAddress.save();
    res.redirect("/user/profile");
  } catch (error) {
    console.log(error.message);
  }
};
const deleteAddAddress = async (req, res) => {
  try {
    await Address.findByIdAndDelete(req.query.addressId);
    res.redirect("/user/profile");
  } catch (error) {
    console.log(error.message);
  }
};

const loadEditAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.query.addressId);
    res.render("user/editAddress", { address });
  } catch (error) {
    console.log(error.message);
  }
};

const EditAddress = async (req, res) => {
  try {
    const address = await Address.updateOne(
      { _id: req.body.addressId },
      {
        $set: {
          pincode: req.body.pincode,
          state: req.body.state,
          city: req.body.city,
          building: req.body.building,
          area: req.body.area,
        },
      }
    );
    // console.log(req.body);
    res.redirect("/user/profile");
  } catch (error) {
    console.log(error.message);
  }
};

const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ User: req.session.user });
    res.render("user/selectAddress", {
      currentUser: await Customer.findById(req.session.user),
      addresses,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const changeDefaultAddress = async (req, res) => {
  try {
      
    await Address.updateOne(
      { User: req.session.user, default: true },
      { $set: { default: false } }
    );
  
    await Address.findByIdAndUpdate(req.body.addressId, {
      $set: { default: true },
    });
    //  const previousPage = req.headers.referer || '/user/checkout'
   
    res.redirect("/user/checkout");
  
  } catch (error) {
    console.log(error.message);
  }
};

const loadCheckout = async (req, res) => {
  try {
   
    const currentUser = await Customer.findById(req.session.user);
    const addresses = await Address.find({ User: req.session.user })


    if (currentUser.is_varified) {
      const defaultAddress = await Address.findOne({
        User: req.session.user,
        default: true,
      });

      await currentUser.populate("cart.product");
      await currentUser.populate("cart.product.category");
      const cartProducts = currentUser.cart;

      const grandTotal = cartProducts.reduce((total, element) => {
        return total + element.quantity * element.product.price;
      }, 0);

      let insufficientStockProduct;
      cartProducts.forEach((cartProduct) => {
        if (cartProduct.product.stock_count < cartProduct.quantity) {
          insufficientStockProduct = cartProduct._id;
        }
      });
      if (!insufficientStockProduct) {
        res.render("user/checkout", {
          currentUser,
          cartProducts,
         
          grandTotal,
          discount: 0,
          addresses,
          error: "",
        });
      } else {
        res.render("user/cart");
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};

const placeOrder = async (req, res) => {
  try {
    
    const currentUser = await Customer.findById(req.session.user);
    await currentUser.populate("cart.product");
    // const address = await Address.findOne({
    //   User: req.session.user,
    //   default: true,
    // });
        let shippingAddress = req.body.shippingAddress
      
    const address = await Address.findOne({User:req.session.user,_id:shippingAddress})
 

    const grandTotal = currentUser.cart.reduce((total, element) => {
      return total + element.quantity * element.product.price;
    }, 0);

    const orderedProducts = currentUser.cart.map((item) => {
      return {
        product: item.product._id,
        quantity: item.quantity,
      };
    });

    let newOrder = new Order({
      user: req.session.user,
      products: orderedProducts,
      totalAmount: grandTotal - req.body.discount + 5,
      paymentMethod: req.body.method,
      deliveryAddress: address,
    });

    if (req.body.method === "cod") {
      await newOrder.save();
 
      res.redirect("/order-successfull");
    } else if (req.body.method === "rzp") {

      const razorpay = new Razorpay({
        key_id: razorpayConfig.RAZORPAY_ID_KEY,
        key_secret: razorpayConfig.RAZORPAY_SECRET_KEY,
      });

      const amountR = grandTotal - req.body.discount + 5;
      const options = {
        amount: amountR * 100,
        currency: "INR",
        receipt: `${Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0")}${Date.now()}`,
      };

      // create a razorpay order
      const razorpayOrder = await razorpay.orders.create(options);

      // save the order detail to your database
      newOrder.razorpayOrderId = razorpayOrder.id;

      // render the razorpay checkout page
      res.render("user/rzp", {
        order: razorpayOrder,
        key_id: process.env.RAZORPAY_ID_KEY,
        user: currentUser,
      });
    }

// stock update
     currentUser.cart.forEach(async(item)=>{
       const foundProduct = await product.findById(item.product._id)
       foundProduct.stock_count-= item.quantity
       await foundProduct.save()
     })
     currentUser.cart = [];
   await currentUser.save()
  } catch (error) {
    console.log(error.message);
  }
};

const saveRzpOrder = async (req, res) => {
  try {
    const { transactionId, orderId, signature } = req.body;
    const amount = parseInt(req.body.amount / 100);

    const currentUser = await Customer.findById(req.session.user);

    await currentUser.populate("cart.product");
    console.log(currentUser.cart[0]);
    const deliveryAddress = await Address.findOne({
      User: req.session.user,
      default: true,
    });
    if (transactionId && orderId && signature) {
      // stock update

      currentUser.cart.forEach(async (item) => {
    
        // const foundProduct = await product.findById(item.product._id);
        // console.log(foundProduct);
        // foundProduct.stock_count -= item.quantity;
        // await foundProduct.save();
      });
      const grandTotal = currentUser.cart.reduce((total, element) => {
        return total + element.quantity * element.product.price;
      }, 0);
      const orderedProducts = currentUser.cart.map((item) => {
        return {
          product: item.product._id,
          quantity: item.quantity,
        };
      });
   
      let newOrder = new Order({
        user: req.session.user,
        products: orderedProducts,
        totalAmount: amount,
        paymentMethod: "rzp",
        deliveryAddress,
      });

      await newOrder.save();
      console.log(newOrder);
    }
    // res.redirect('/order-successfull')
    res.json({ success: true });
  } catch (error) {
    console.log(error.message);
  }
};

const getOrders = async (req, res) => {
  try {
    await updateOrderStatus();

    const currentUser = await Customer.findById(req.session.user);

    const orders = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.session.user) } },
      { $unwind: "$products" },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "orderedProducts",
        },
      },
      { $sort: { orderDate: -1 } },
    ]);

    res.render("user/orders", {
      currentUser,
      orders,
      activePage: "Profile",
    });
  } catch (error) {
    console.log(error.message);
  }
};

const updateOrderStatus = async () => {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // update orders from Processing to shipped after two days
    await Order.updateMany(
      {
        status: "Processing",
        deliveryDate: { $lte: twoDaysAgo },
      },
      { $set: { status: "Shipped" } }
    );

    const currentDate = new Date();

    // Update orders from Shipped to delivered if the deliveryDate is in the past
    await Order.updateMany(
      {
        status: "Shipped",
        deliveryDate: { $lte: currentDate },
      },
      { $set: { status: "Delivered" } }
    );
  } catch (error) {
    console.log(error.message);
  }
};

const loadOrderSuccess = async (req, res) => {
  try {
    res.render("user/orderSuccesful");
  } catch (error) {
    console.log(error.message);
  }
};

const getWallet = async (req, res) => {
  try {
    console.log(("here cpmeon"));
    const currentUser = await Customer.findById(req.session.user).populate("wallet").sort({
      "wallet.transactions.timestamp": -1,
    });
    console.log(currentUser);
    res.render("user/wallet", {
      currentUser,
    });
  } catch (error) {
    console.log(error.message);
  }
};

const cancelOrder = async(req,res)=>{
  try{
    
    const foundOrder = await Order.findById(req.body.orderId).populate("products.product")
    const foundProduct = foundOrder.products.find((order)=>order.product._id.toString()=== req.body.productId)
  
    if(foundOrder.paymentMethod!=='cod'){
      const currentUser = await Customer.findById(req.session.user)
     
      const refundAmount = (foundProduct.product.price * foundProduct.quantity) + 5
   
      currentUser.wallet.balance += refundAmount

      foundOrder.totalAmount -=(foundProduct.product.price * foundProduct.quantity ) 
        if(foundOrder.totalAmount ===5){
          foundOrder.totalAmount = 0
        }

        const transactionData = {
          amount: refundAmount,
          description:'Order cancelled',
          type:'Credit'
        }
        currentUser.wallet.transactions.push(transactionData)
        foundProduct.isCancelled = true
        
         // update the stock of the cancelled product
             const foundCurrentProduct = await product.findById(req.body.productId)
             foundCurrentProduct.stock_count += foundProduct.quantity
           
             // save the changes
        await currentUser.save()
         await foundCurrentProduct.save()
    }else{
      let amount = (foundProduct.product.price * foundProduct.quantity)
      foundOrder.totalAmount -= amount
    
      
      if(foundOrder.totalAmount ===5){
        foundOrder.totalAmount =0
      }
      
       
      foundProduct.isCancelled = true;
      const foundCurrentOrder = foundOrder.products.find((order) => order.product._id.toString() === req.body.productId);
      const foundCurrentProduct = await product.findById(req.body.productId);
      foundCurrentProduct.stock_count += foundCurrentOrder.quantity;
      await foundCurrentProduct.save();  
    }
    

    function areAllProductsCancelled(order){
      for(const product of order.products){
        if(!product.isCancelled){
          return false
        }
      }
      return true 
    }

   if(areAllProductsCancelled(foundOrder)){
    foundOrder.status ="Cancelled"
   }
   
   await foundOrder.save()
   res.redirect("/orders")

  }catch(error){
    console.log(error.message);
  }
}

const getReturnProductForm = async(req,res)=>{
  try{

    
        const Product = await product.findById(req.query.product)
        const currentUser = await Customer.findById(req.session.user)
     
       
        
        const category = req.query.category
        const quantity = req.query.quantity

        const defaultAddress = await Address.findOne({User:req.session.user,default:true})
        res.render("user/returnForm",{
          currentAddress:defaultAddress,
          currentUser,
          category,
          Product,
          quantity,
          order:req.query.order
        })
  }catch(error){
    console.log(error.message);
}
}

const requestReturnProduct = async(req,res)=>{
  try{
  

    const foundOrder = await Order.findById(req.body.order).populate('products.product')
    const currentUser = await Customer.findById(req.session.user)
    const foundProduct = await product.findOne({ product_name: req.body.product})
   
    const returnProduct = new Return({
      user : currentUser,
      order:foundOrder._id,
      product: foundProduct._id,
      quantity: parseInt(req.body.quantity),
      reason: req.body.reason,
      condition:req.body.condition,
      address:req.body.address
    })
    
    await returnProduct.save()

    foundOrder.products.forEach((product) => {
      if (product.product._id.toString() === foundProduct._id.toString()) {
          product.returnRequested = 'Pending';
      }
  });
  await foundOrder.save();
    res.redirect("/orders")
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
  updateCartItem,
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
  getOrders,
  getSingleProduct,
  getAddresses,
  changeDefaultAddress,
  loadOrderSuccess,
  getWallet,
  saveRzpOrder,
  cancelOrder,
  getReturnProductForm ,
  requestReturnProduct,
  resendOtp
};
