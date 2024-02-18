const express = require("express");
const Address = require("../models/userAddress");
const Customer = require("../models/customerModel");
const Coupon = require("../models/couponModel");
const Order = require("../models/orderModel");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const UserOTPVerification = require("../models/userOTPVerification");
const product = require("../models/productModel");
const productCategory = require("../models/productCategory");
const Return = require("../models/returnProductModel");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const Banner = require("../models/bannerModel")
const razorpayConfig = require("./utils/razorpayConfig");
const sharp = require("sharp");


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

const totalSum = async function (id) {
  try {
    const userData = await Customer.findById(id);

    if (!userData || Object.keys(userData).length === 0) {
      // Handle the case where userData is null or empty
      return 0;
    }

    const cart = userData.cart;

    if (cart.length !== 0) {
      // Move the console.log(cart) here

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
};
// load Home
const loadHome = async (req, res) => {
  try {
    const banners = await Banner.find()
     let currentUser = await Customer.findById(req.session.user)
     const foundProducts = await product
     .find({ is_delete: false })
     .populate("category")
     .populate("offer")
     .sort({_id:-1})
     .limit(8)
    res.render("user/index",{banners,currentUser,productDatas:foundProducts});
  } catch (error) {
    console.log(error.message);
  }
};

//load login
const loadLogin = async (req, res) => {
  try {
    res.render("user/login");
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

// //user valid
const checkUserValid = async (req, res) => {
  const { email, password } = req.body;
try{
  const email = req.body.email.trim()
  const password = req.body.password.trim()
  if(!email || !password){
    return res.render("user/login", { message: "Empty information are not possible" });
  }else if(!/^\S+@\S+\.\S+$/.test(email)){
    return res.render("user/login", { message: "Invalid Email.." });
  }else{
  const customer = await Customer.findOne({ email });
  if (!customer) {
    return res.render("user/login", { message: "invalid email,please Signup" });
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
}
}catch(error){
  res.render("error/internalError",{error})
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
    res.render("error/internalError",{error})
  }
};

//load register
const loadRegister = async (req, res, next) => {
  try {
    res.render("user/register");
  } catch (error) {
    res.render("error/internalError",{error})
  }
};
// insert user
const insertUser = async (req, res,next) => {
  const { name, email, password, mobile } = req.body;
  try {
    const name = req.body.name.trim();
    const email = req.body.email.trim();
    const password = req.body.password.trim();
    const mobileNo = req.body.mobile.trim();
    if (!name || !email || !password || !mobileNo) {
      return res.render("user/register", { message: "All fields are required" });
  }
  if(mobileNo.length<10){
    return res.render("user/register", { message: "mobileno must be atleast 10" });
  }

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
 
    // save user into database
    const userExist = await Customer.findOne({ email, is_varified: true });
    if (userExist) {
      res.render("user/register", {
        message: "this account already existed",
        user: req.session.user,
      });
    } else {
      const userData = await customer.save();
      if (userData) {
        //send the verification email
        sendOTPVerificationEmail(userData, res,next);
        const user_id = userData._id;
        return res.redirect(`/user/otpVerification?userId=${user_id}`);
      } else {
        res.render("user/register", {
          message: "account creation has been failed",
          user: req.session.user,
        });
      }
    }
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

// load otp page

const loadOTPpage = async (req, res) => {
  try {
    res.render("user/otppage", { id: req.query.userId });
  } catch (error) {
    res.render("error/internalError",{error})
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


const sendOTPVerificationEmail = async ({ _id, email }, res,next) => {
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
    next(error);
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
  
    const isValid = await bcrypt.compare(OTP, otp);

    if (!isValid) {  
      return res.render("user/otppage", { message: "invalid otp", id: ID });
    }
    await Customer.updateOne({ _id: ID }, { $set: { is_varified: true } });
    await Customer.deleteMany({is_varified:false})
    await UserOTPVerification.deleteOne({ userId });
    return res.redirect("/user-Login");
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

const resendOtp = async (req, res) => {
  try {
    const { userId } = req.body;
    const userDate = await Customer.findById(userId);
    await sendOTPVerificationEmail(userDate);
    if (userDate) {
      return res.redirect(`/user/otpVerification?userId=${userId}`);
    }
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

const loadShop = async (req, res) => {
  try {
  
    const page = parseInt(req.params.page) || 1;
    const pageSize = 6;
    const skip = (page - 1) * pageSize;

    const totalProducts = await product.countDocuments({
      is_delete: false,
    });
    const totalPages = Math.ceil(totalProducts / pageSize);
    const foundProducts = await product
      .find({ is_delete: false })
      .populate("category")
      .skip(skip)
      .limit(pageSize)
      .populate("offer")
     .sort({_id:-1})
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
    res.render("error/internalError",{error})
  }
};

const   loadShopWithCriteria = async(req,res)=>{
    try{
      const minPrice = parseFloat(req.query.minPrice) ||0
      const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_VALUE
      let priceFilter={}
      if(maxPrice<Number.MAX_VALUE){
        priceFilter ={$gte:minPrice,$lte:maxPrice}
      }else{
        priceFilter = { $gte: minPrice }
      }
       const searchBrand = req.query.brand
      const searchProduct = req.query.search;
        const selectedCategory = req.query.category;
        if(selectedCategory){
          const foundProducts =  await product.find({is_delete:false,category:selectedCategory}).populate("category")
          const foundCategories = await productCategory.find({ removed: false });

          res.render("user/shop", {
            productDatas: foundProducts,
            currentUser: await Customer.findById(req.session.user),
            categoryBased: true,
            categoryDatas: foundCategories,
            category: { name: "Filtered Category", id: selectedCategory },
            activePage: "Shop",
            currentPage: 1, // Assuming you want to reset to the first page
            totalPages: 1, // Assuming only one page for filtered results
          });
        }else if(searchProduct){
          const foundProducts = await product.find({is_delete:false, product_name: { $regex: new RegExp(req.query.search, 'i') } })
        
          const foundCategories = await productCategory.find({ removed: false });

          res.render("user/shop", {
            productDatas: foundProducts,
            currentUser: await Customer.findById(req.session.user),
            categoryBased: false,
            categoryDatas: foundCategories,
            category: { name: "shop All", id: "" },
            activePage: "Shop",
            currentPage: 1,
            totalPages: 1,
          });
         }else if(searchBrand){
          const foundProducts = await product.find({is_delete:false,brand_name:{$regex:new RegExp(searchBrand,'i')}} )
          const foundCategories = await productCategory.find({ removed: false })
          return res.json({prod : foundProducts,Cate : foundCategories })
         }else if(minPrice || maxPrice){
          const foundProducts = await product
          .find({
            is_delete: false,
            price: priceFilter,
          })
          const foundCategories = await productCategory.find({ removed: false });
          res.render("user/shop", {
            productDatas: foundProducts,
            currentUser: await Customer.findById(req.session.user),
            categoryBased: false,
            categoryDatas: foundCategories,
            category: { name: "shop All", id: "" },
            activePage: "Shop",
            currentPage: 1,
            totalPages: 1,
          });
         }else {
          // Handle the case when no category is selected
          res.redirect('/shop/1'); // Redirect to the default shop page
        }
        
    }catch(error){
      res.render("error/internalError",{error})
    }

}

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
    res.render("error/internalError",{error})
  }
};


const loadcart = async (req, res) => {
  try {

      const stockError = req.session.stockError
      delete req.session.stockError
    
    const currentUser = await Customer.findById(req.session.user);
  
    if (currentUser.is_varified) {
      await currentUser.populate("cart.product");
      await currentUser.populate("cart.product.category");

      currentUser.cart = currentUser.cart.filter((cartItem) => {
        return cartItem.product && !cartItem.product.is_delete;
      });
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
        if(element.product.offerPrice>0 && element.product.categoryOfferPrice){
          if(element.product.offerPrice<element.product.categoryOfferPrice){
            return total + element.quantity * element.product.offerPrice
          }else{
            return total + element.quantity * element.product.categoryOfferPrice
          }
        }else if(element.product.offerPrice>0){
           return total + element.quantity * element.product.offerPrice
        }else if(element.product.categoryOfferPrice>0){
            return total + element.quantity * element.product.categoryOfferPrice
        }else{
          return total + element.quantity * element.product.price
        }
      }, 0);

      res.render("user/cart", {
        currentUser,
        cartProducts,
        grandTotal,
        insufficientStockProduct: "",
        activePage: "Cart",
        stockError:stockError?stockError:"",
  
      });
    }
  } catch (error) {
    res.render("error/internalError",{error})
  }
};


const addToCart = async (req, res) => {
  try {
    const currentUser = await Customer.findById(req.session.user);
    const { Product, hiddenQuantity, ProductPrice } = req.body;
    const existingCartItem = currentUser.cart.find((item) => {
      return item.product && item.product.toString() === Product;
    });
    let priceSetting = await product.findById(req.body.Product)
    let proPrice
    if(priceSetting.offerPrice>0 && priceSetting.categoryOfferPrice>0){
        if(priceSetting.offerPrice<priceSetting.categoryOfferPrice){
          proPrice = priceSetting.offerPrice
        }else{
          proPrice = priceSetting.categoryOfferPrice
        }
    }else if(priceSetting.offerPrice>0){
        proPrice= priceSetting.offerPrice
    }else if(priceSetting.categoryOfferPrice>0){
      proPrice = priceSetting.categoryOfferPrice
    }else{
      proPrice = priceSetting.price
    }
    if (existingCartItem) {
      existingCartItem.quantity += parseInt(hiddenQuantity);
    } else {
      const cartItem = {
        product: Product,
        quantity: parseInt(hiddenQuantity),
        total: proPrice,
      };
      currentUser.cart.push(cartItem);
    }
    await currentUser.save();
    res.redirect("/cart"); // Assuming you want to redirect to the cart page after adding the item.
  } catch (error) {
    res.render("error/internalError",{error})
    res.status(500).send("Internal Server Error");
  }
};

const updateCartItem = async (req, res) => {
  const { cartItemId, action } = req.params;
  try {
    const id = req.session.user;
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
    const totSum = await totalSum(id);
    // console.log(totSum);
    res
      .status(200)
      .json({
        message: "Cart item updated successfully",
        totalSum: cartItem.total,
        totalCartSum: totSum,
      });
  } catch (error) {
    res.render("error/internalError",{error})
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
    res.render("error/internalError",{error})
    res.status(500).send("Internal Server Error");
  }
};

const loadprofile = async (req, res) => {
  try {
    const customer = await Customer.findById(req.session.user);
    const addresses = await Address.find({ User: req.session.user });
    currentUser = await Customer.findById(req.session.user)
    if (!customer) {
      return res.status(404).send("customer not found");
    }
    res.render("user/userprofile", { customer, addresses, currentUser });
  } catch (error) {
    res.render("error/internalError",{error})
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
    res.render("error/internalError",{error})
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
    res.render("error/internalError",{error})
  }
};

const loadAddaddress = async (req, res) => {
  try {
    res.render("user/addAddress");
  } catch (error) {
    res.render("error/internalError",{error})
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
    res.render("error/internalError",{error})
  }
};
const deleteAddAddress = async (req, res) => {
  try {
    await Address.findByIdAndDelete(req.query.addressId);
    res.redirect("/user/profile");
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

const loadEditAddress = async (req, res) => {
  try {
    const address = await Address.findById(req.query.addressId);
    res.render("user/editAddress", { address });
  } catch (error) {
    res.render("error/internalError",{error})
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
    res.redirect("/user/profile");
  } catch (error) {
    res.render("error/internalError",{error})
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
    res.render("error/internalError",{error})
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
    res.redirect("/user/checkout");
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

const loadCheckout = async (req, res) => {
  try {
    let discountAmount = req.query.discount;
    let error = req.query.error;
    if (!discountAmount) {
      discountAmount = 0;
    }
    const currentUser = await Customer.findById(req.session.user);

    const addresses = await Address.find({ User: req.session.user });
    const noOfaddress = addresses.length
   
    const currentCoupon = req.body.currentCoupon;

    if (currentUser.is_varified) {
      const defaultAddress = await Address.findOne({
        User: req.session.user,
        default: true,
      });

      await currentUser.populate({
        path: "cart.product",
        model: "product",
        populate: {
          path: "category",
          model: "productCategory",
        },
      });

      const cartProducts = currentUser.cart;
      const noOfItems = cartProducts.length;
  
      let grandTotal = cartProducts.reduce((total, element) => {
        if(element.product.offerPrice>0 && element.product.categoryOfferPrice){
          if(element.product.offerPrice<element.product.categoryOfferPrice){
            return total + element.quantity * element.product.offerPrice
          }else{
            return total + element.quantity * element.product.categoryOfferPrice
          }
        }else if(element.product.offerPrice>0){
           return total + element.quantity * element.product.offerPrice
        }else if(element.product.categoryOfferPrice>0){
            return total + element.quantity * element.product.categoryOfferPrice
        }else{
          return total + element.quantity * element.product.price
        }
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
          cartProducts:cartProducts || [],
          noOfItems,
          grandTotal,
          discount: discountAmount,
          addresses,
          error,
          currentCoupon:'',
          noOfaddress,
          couponError:'',
          error: "",

        });
      } else {
        req.session.stockError = "insufficient stock"
        res.redirect("/cart");
      }
    }
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

const placeOrder = async (req, res) => {
  try {
    const addresses = await Address.find({ User: req.session.user });
    const final = req.body.discount
    const currentUser = await Customer.findById(req.session.user);
    await currentUser.populate("cart.product");
    let shippingAddress = req.body.shippingAddress;

    await Address.updateOne(
      { User: req.session.user, default: true },
      { $set: { default: false } }
    );
    const address = await Address.findByIdAndUpdate(
      shippingAddress,
      { $set: { default: true } },
      { new: true }
    );

    let grandTotal = currentUser.cart.reduce((total, element) => {
      if(element.product.offerPrice>0 && element.product.categoryOfferPrice){
        if(element.product.offerPrice<element.product.categoryOfferPrice){
          return total + element.quantity * element.product.offerPrice
        }else{
          return total + element.quantity * element.product.categoryOfferPrice
        }
      }else if(element.product.offerPrice>0){
         return total + element.quantity * element.product.offerPrice
      }else if(element.product.categoryOfferPrice>0){
          return total + element.quantity * element.product.categoryOfferPrice
      }else{
        return total + element.quantity * element.product.price
      }
    }, 0);

    const orderedProducts = currentUser.cart.map((item) => {
      var price;
     if(item.product.offerPrice>0 && item.product.categoryOfferPrice>0){
         if(item.product.offerPrice< item.product.categoryOfferPrice){
            price = item.product.offerPrice
         }else{
          price = item.product.categoryOfferPrice
         }
     }else if(item.product.offerPrice>0){
      price = item.product.offerPrice
     }else if (item.product.categoryOfferPrice>0){
      price = item.product.categoryOfferPrice
     }else{
      price = item.product.price
     }

      return {
        product: item.product._id,
        quantity: item.quantity,
        Price:price
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

      const order = await Order.findById(newOrder._id);
      res.render("user/orderSuccesful", { order,final });
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
      return res.render("user/rzp", {
        order: razorpayOrder,
        key_id: process.env.RAZORPAY_ID_KEY,
        user: currentUser,
      });
    } else {
      if (currentUser.wallet.balance < grandTotal + 5) {
        return res.render("user/checkout", {
          currentUser,
          cartProducts: currentUser.cart,
          currentAddress: address,
          discount: 0,
          error: "insufficient wallet balance",
          currentCoupon: "",
          couponError: "",
          noOfaddress:'',
          addresses,
          noOfItems:'',
          grandTotal
        });
      } else {
        await newOrder.save();
        currentUser.wallet.balance -= grandTotal + 5;
        const transactionData = {
          amount: grandTotal + 5,
          description: "order placed.",
          type: "Debit",
        };
        currentUser.wallet.transactions.push(transactionData);
      }
    }

    // stock update

    currentUser.cart.forEach(async (item) => {
      const foundProduct = await product.findById(item.product._id);
      foundProduct.stock_count -= item.quantity;
      await foundProduct.save();
    });

    currentUser.cart = [];
   
    // coupons
    
     const foundCoupon = await Coupon.findOne({
      isActive:true,minimumPurchaseAmount:{$lte:grandTotal}
     }).sort({minimumPurchaseAmount:-1})
   
   if(foundCoupon){
    const couponExists = currentUser.earnedCoupons.some((coupon)=>coupon.coupon.equals(foundCoupon._id))
      if(!couponExists){
        currentUser.earnedCoupons.push({coupon:foundCoupon._id})
      }
   }
   const currentUsedCoupon = await currentUser.earnedCoupons.find((coupon)=>coupon.coupon.equals(req.body.currentCoupon))
     if(currentUsedCoupon){
      currentUsedCoupon.isUsed = true
      await Coupon.findByIdAndUpdate(req.body.currentCoupon,{$inc:{usedCount:1}})
     }
     await currentUser.save()
     res.redirect('/orders')
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

const saveRzpOrder = async (req, res) => {
  try {
    const { transactionId, orderId, signature } = req.body;
    const amount = parseInt(req.body.amount / 100);

    const currentUser = await Customer.findById(req.session.user);
    await currentUser.populate("cart.product");
    const deliveryAddress = await Address.findOne({
      User: req.session.user,
      default: true,
    });
    if (transactionId && orderId && signature) {
      currentUser.cart.forEach(async (item) => {
        const foundProduct = await product.findById(item.product._id);
        foundProduct.stock_count -= item.quantity;
        await foundProduct.save();
      });
      const grandTotal = currentUser.cart.reduce((total, element) => {
        if(element.product.offerPrice>0 && element.product.categoryOfferPrice){
          if(element.product.offerPrice<element.product.categoryOfferPrice){
            return total + element.quantity * element.product.offerPrice
          }else{
            return total + element.quantity * element.product.categoryOfferPrice
          }
        }else if(element.product.offerPrice>0){
           return total + element.quantity * element.product.offerPrice
        }else if(element.product.categoryOfferPrice>0){
            return total + element.quantity * element.product.categoryOfferPrice
        }else{
          return total + element.quantity * element.product.price
        }
      }, 0);
      const orderedProducts = currentUser.cart.map((item) => {
        var price;
     if(item.product.offerPrice>0 && item.product.categoryOfferPrice>0){
         if(item.product.offerPrice< item.product.categoryOfferPrice){
            price = item.product.offerPrice
         }else{
          price = item.product.categoryOfferPrice
         }
     }else if(item.product.offerPrice>0){
      price = item.product.offerPrice
     }else if (item.product.categoryOfferPrice>0){
      price = item.product.categoryOfferPrice
     }else{
      price = item.product.price
     }

      return {
        product: item.product._id,
        quantity: item.quantity,
        Price:price
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
      currentUser.cart = [];
      
  // coupons 
  const foundCoupon = await Coupon.findOne({
    isActive: true, minimumPurchaseAmount: { $lte: grandTotal }
}).sort({ minimumPurchaseAmount: -1 });

if (foundCoupon) {
  const couponExists = currentUser.earnedCoupons.some((coupon) => coupon.coupon.equals(foundCoupon._id));
  if (!couponExists) {
      currentUser.earnedCoupons.push({ coupon: foundCoupon._id });
  }
}

const currentUsedCoupon = await currentUser.earnedCoupons.find((coupon) => coupon.coupon.equals(req.body.currentCoupon));
if (currentUsedCoupon) {
  currentUsedCoupon.isUsed = true;
  await Coupon.findByIdAndUpdate(req.body.currentCoupon, { $inc: { usedCount: 1 } });
}

await currentUser.save();    
      await currentUser.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

const getCoupons = async (req, res) => {
  try {
         const currentUser = await Customer.findById(req.session.user).populate('earnedCoupons.coupon')
         const allCoupons = await Coupon.find({isActive:true})
         const earnedCoupons = currentUser.earnedCoupons

         // convert list of earned coupon ids to an array
         const earnedCouponIds = earnedCoupons.map((coupon)=>coupon._id.toString())
         // Filter out earned coupons from the active coupons list
         const remainingCoupons = allCoupons.filter((coupon)=>!earnedCouponIds.includes(coupon._id.toString()))
         res.render("user/coupons",{
          currentUser,allCoupons:remainingCoupons,earnedCoupons

         })
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

const applyCoupon = async (req, res) => {
  try {
    const currentUser = await Customer.findById(req.session.user).populate(
      "earnedCoupons.coupon"
    );
    const addresses = await Address.find({ User: req.session.user });
    await currentUser.populate("cart.product");
    await currentUser.populate("cart.product.category");
    const cartProducts = currentUser.cart;
    const currentCoupon = await Coupon.findOne({ code: req.body.coupon });
    const grandTotal = cartProducts.reduce((total, element) => {
      if(element.product.offerPrice>0 && element.product.categoryOfferPrice){
        if(element.product.offerPrice<element.product.categoryOfferPrice){
          return total + element.quantity * element.product.offerPrice
        }else{
          return total + element.quantity * element.product.categoryOfferPrice
        }
      }else if(element.product.offerPrice>0){
         return total + element.quantity * element.product.offerPrice
      }else if(element.product.categoryOfferPrice>0){
          return total + element.quantity * element.product.categoryOfferPrice
      }else{
        return total + element.quantity * element.product.price
      }
    }, 0);
    let couponError = "";
    let discount = 0;
    if (currentCoupon) {
      const foundCoupon = currentUser.earnedCoupons.find((coupon) =>
        coupon.coupon._id.equals(currentCoupon._id)
      );
      if(foundCoupon){
        if (foundCoupon.coupon.isActive) {
          if (!foundCoupon.isUsed) {
              if (foundCoupon.coupon.discountType === 'fixedAmount') {
                  discount = foundCoupon.coupon.discountAmount;
              } else {
                  discount = (foundCoupon.coupon.discountAmount / 100) * grandTotal;
              }
          } else {
              couponError = foundCoupon.isUsed ? "Coupon already used." : "Coupon is inactive.";
          }
      } else {
          couponError = foundCoupon.isUsed ? "Coupon already used." : "Coupon is inactive.";
      }
  } else {
      couponError = "Invalid coupon code.";
  }
    }else{
      couponError = "Invalid coupon code.";
    }
    res.render("user/checkout", {
      currentUser,
      cartProducts,
      addresses,
      discount,
      grandTotal,
      currentCoupon: couponError ? '' : currentCoupon._id,
      couponError,
      error: "",
      noOfaddress:'',
      noOfItems:''
  });

  } catch (error) {
    res.render("error/internalError",{error})
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
    res.render("error/internalError",{error})
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
    res.render("error/internalError",{error})
  }
};


const getWallet = async (req, res) => {
  try {
    // console.log("here......");
    const currentUser = await Customer.findById(req.session.user).sort({
      "wallet.transactions.timestamp": -1,
    });
   let balance = currentUser.wallet.balance
    const total = currentUser.wallet.transactions.reduce((acc,value)=>{
    return acc+ value.amount
    },0);
   
    res.render("user/wallet", {
      total,
      currentUser,
      balance
    });
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

const cancelOrder = async (req, res) => {
  try {
    let  refundAmount;
    const foundOrder = await Order.findById(req.body.orderId).populate(
      "products.product"
    );
    const foundProduct = foundOrder.products.find(
      (order) => order.product._id.toString() === req.body.productId
    );

    if (foundOrder.paymentMethod !== "cod") {
      const currentUser = await Customer.findById(req.session.user);
         if(foundProduct.product.offerPrice>0 && foundProduct.product.categoryOfferPrice>0){
            if(foundProduct.product.offerPrice< foundProduct.product.categoryOfferPrice){
              refundAmount= foundProduct.product.offerPrice * foundProduct.quantity
            }else{
              refundAmount = foundProduct.product.categoryOfferPrice * foundProduct.quantity
            }
         }else if(foundProduct.product.offerPrice>0){
             refundAmount = foundProduct.product.offerPrice * foundProduct.quantity
         }else if(foundProduct.product.categoryOfferPrice>0){
          refundAmount = foundProduct.product.categoryOfferPrice * foundProduct.quantity
         }else{
          refundAmount = foundProduct.product.price * foundProduct.quantity
         }
     currentUser.wallet += refundAmount

      if(foundProduct.product.offerPrice>0 && foundProduct.product.categoryOfferPrice>0){
           if(foundProduct.product.offerPrice<foundProduct.product.categoryOfferPrice){
              foundOrder.totalAmount -= foundProduct.offerPrice * foundProduct.quantity
           }else{
            foundOrder.totalAmount -= foundProduct.categoryOfferPrice * foundProduct.quantity
           }
      }else if(foundProduct.product.offerPrice>0){
        foundOrder.totalAmount -= foundProduct.product.offerPrice * foundProduct.quantity
      }else if(foundProduct.product.categoryOfferPrice>0){
        foundOrder.totalAmount -= foundProduct.product.categoryOfferPrice * foundProduct.quantity
      }else{
        foundOrder.totalAmount -= foundProduct.product.price * foundProduct.quantity
      }


      if (foundOrder.totalAmount === 5) {
        foundOrder.totalAmount = 0;
      }

      const transactionData = {
        amount: refundAmount,
        description: "Order cancelled",
        type: "Credit",
      };
      currentUser.wallet.transactions.push(transactionData);
      foundProduct.isCancelled = true;

      // update the stock of the cancelled product
      const foundCurrentProduct = await product.findById(req.body.productId);
      foundCurrentProduct.stock_count += foundProduct.quantity;

      // save the changes
      await currentUser.save();
      await foundCurrentProduct.save();
    } else {
      let amount 
      if(foundProduct.product.offerPrice>0 && foundProduct.product.categoryOfferPrice>0){
        if(foundProduct.product.offerPrice<foundProduct.product.categoryOfferPrice){
           amount = foundProduct.offerPrice * foundProduct.quantity
        }else{
          amount = foundProduct.categoryOfferPrice * foundProduct.quantity
        }
   }else if(foundProduct.product.offerPrice>0){
          amount = foundProduct.product.offerPrice * foundProduct.quantity
   }else if(foundProduct.product.categoryOfferPrice>0){
           amount = foundProduct.product.categoryOfferPrice * foundProduct.quantity
   }else{
            amount = foundProduct.product.price * foundProduct.quantity
   }
      foundOrder.totalAmount -= amount;

      if (foundOrder.totalAmount === 5) {
        foundOrder.totalAmount = 0;
      }

      foundProduct.isCancelled = true;
      const foundCurrentOrder = foundOrder.products.find(
        (order) => order.product._id.toString() === req.body.productId
      );
      const foundCurrentProduct = await product.findById(req.body.productId);
      foundCurrentProduct.stock_count += foundCurrentOrder.quantity;
      await foundCurrentProduct.save();
    }

    function areAllProductsCancelled(order) {
      for (const product of order.products) {
        if (!product.isCancelled) {
          return false;
        }
      }
      return true;
    }

    if (areAllProductsCancelled(foundOrder)) {
      foundOrder.status = "Cancelled";
    }

    await foundOrder.save();
    res.redirect("/orders");
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

const getReturnProductForm = async (req, res) => {
  try {
    const Product = await product.findById(req.query.product);
    const currentUser = await Customer.findById(req.session.user);
    const category = req.query.category;
    const quantity = req.query.quantity;

    const defaultAddress = await Address.findOne({
      User: req.session.user,
      default: true,
    });
    res.render("user/returnForm", {
      currentAddress: defaultAddress,
      currentUser,
      category,
      Product,
      quantity,
      order: req.query.order,
    });
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

const requestReturnProduct = async (req, res) => {
  try {
    const foundOrder = await Order.findById(req.body.order).populate(
      "products.product"
    );
    const currentUser = await Customer.findById(req.session.user);
    const foundProduct = await product.findOne({
      product_name: req.body.product,
    });

    const returnProduct = new Return({
      user: currentUser,
      order: foundOrder._id,
      product: foundProduct._id,
      quantity: parseInt(req.body.quantity),
      reason: req.body.reason,
      condition: req.body.condition,
      address: req.body.address,
    });

    await returnProduct.save();

    foundOrder.products.forEach((product) => {
      if (product.product._id.toString() === foundProduct._id.toString()) {
        product.returnRequested = "Pending";
      }
    });
    await foundOrder.save();
    res.redirect("/orders");
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

const loadInvoice = async (req, res) => {
  const id = req.params.id;
  let discount = req.query.discount || 0;
  const order = await Order.findById(id).populate("products.product");
  const totalHt = order.totalAmount - 5;
  const totalAmount = order.totalAmount -5;
  const user = await Customer.findById(req.session.user);
  const deliveryAddress = await Address.findOne({
    User: req.session.user,
    default: true,
  });
  try {
    res.render("user/invoice", {
      order,
      user,
      totalHt,
      totalAmount,
      deliveryAddress,
      discount
    });
  } catch (error) {
    res.render("error/internalError",{error})
  }
};

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
  getWallet,
  saveRzpOrder,
  cancelOrder,
  getReturnProductForm,
  requestReturnProduct,
  resendOtp,
  getCoupons,
  applyCoupon,
  loadInvoice,
  loadShopWithCriteria,
};
