const express = require("express");
const bcrypt = require("bcrypt");
const Customer = require("../models/customerModel");
const productCategory = require("../models/productCategory");
const product = require("../models/productModel");
const Order = require("../models/orderModel");
const Return = require("../models/returnProductModel");
const Coupon = require("../models/couponModel");
const Offer = require("../models/offerModel");
const Banner = require("../models/bannerModel");
const loadAdminLogin = async (req, res) => {
  try {
    if (!req.session.admin) {
    } else {
      res.redirect("admin/dashboard");
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const loginValidation = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (email === "") {
      res.render("admin/adminLogin", { message: "Email required" });
    } else if (password === "") {
      res.render("admin/adminLogin", { message: "password is required" });
    } else {
      next();
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const adminValid = async (req, res) => {
  try {
    const { email, password } = req.body;
    const validEmail = await Customer.findOne({ email });

    if (
      !validEmail ||
      validEmail === "undefined" ||
      validEmail === null ||
      validEmail === ""
    ) {
      return res.render("admin/adminLogin", { message: "email is not valid" });
    } else if (!/^\S+@\S+\.\S+$/.test(email) || email === "") {
      res.render("admin/adminLogin", { message: "Invalid Email " });
    } else {
      const dpassword = validEmail.password;
      const matchPassword = await bcrypt.compare(password, dpassword);
      if (!matchPassword) {
        res.render("admin/adminLogin", { message: "password is miss match" });
      } else {
        if (validEmail.is_Admin === true) {
          req.session.admin = validEmail._id;
          res.redirect("/admin/dashboard");
        } else {
          res.render("admin/adminLogin", { message: "you are not admin" });
        }
      }
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const loadDash = async (req, res) => {
  try {
    const admin = await Customer.find({ is_Admin: true });
    const today = new Date();
    // Calculate the start and end dates for this month
    const thisMonthStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
      0,
      0,
      0
    );
    const thisMonthEnd = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59
    );

    console.log(thisMonthStart);
    console.log(thisMonthEnd);
    // MongoDB aggregation pipeline to fetch the required data
    const pipeline = [
      {
        $match: {
          orderDate: {
            $gte: thisMonthStart,
            $lte: thisMonthEnd,
          },
        },
      },
      {
        $facet: {
          todaysOrders: [
            {
              $match: {
                orderDate: {
                  $gte: new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                  ),
                  $lt: new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate() + 1
                  ),
                },
              },
            },
            { $count: "count" },
          ],
          thisMonthsOrders: [{ $count: "count" }],
          thisMonthsTotalRevenue: [
            { $group: { _id: null, total: { $sum: "$totalAmount" } } },
          ],
          totalCustomersThisMonth: [
            {
              $group: {
                _id: "$user",
              },
            },
            { $count: "count" },
          ],
        },
      },
    ];

    const order = await Order.aggregate(pipeline);

    let todaysOrders;
    let thisMonthsOrders;
    let thisMonthsTotalRevenue;
    let totalCustomersThisMonth;

    order.forEach((ord) => {
      todaysOrders = ord.todaysOrders[0] ? ord.todaysOrders[0].count : 0;
      thisMonthsOrders = ord.thisMonthsOrders[0]
        ? ord.thisMonthsOrders[0].count
        : 0;
      thisMonthsTotalRevenue = ord.thisMonthsTotalRevenue[0]
        ? ord.thisMonthsTotalRevenue[0].total
        : 0;
      totalCustomersThisMonth = ord.totalCustomersThisMonth[0]
        ? ord.totalCustomersThisMonth[0].count
        : 0;
    });

    // for charts
    const orderChartData = await Order.find({ status: "Delivered" });
    // Initialize objects to store payment method counts and monthly order counts
    const paymentMethods = {};
    const monthlyOrderCountsCurrentYear = {};

    // Get the current year
    const currentYear = new Date().getFullYear();

    // Iterate through each order
    orderChartData.forEach((order) => {
      // Extract payment method and order date from the order object
      const { paymentMethod, orderDate } = order;

      // Count payment methods
      if (paymentMethod) {
        if (!paymentMethods[paymentMethod]) {
          paymentMethods[paymentMethod] = order.totalAmount;
        } else {
          paymentMethods[paymentMethod] += order.totalAmount;
        }
      }

      // Count orders by month
      if (orderDate) {
        const orderYear = orderDate.getFullYear();
        if (orderYear === currentYear) {
          const orderMonth = orderDate.getMonth(); // Get the month (0-11)

          // Create a unique key for the month
          const monthKey = `${orderMonth}`; // Month is 0-based

          if (!monthlyOrderCountsCurrentYear[monthKey]) {
            monthlyOrderCountsCurrentYear[monthKey] = 1;
          } else {
            monthlyOrderCountsCurrentYear[monthKey]++;
          }
        }
      }
    });

    const resultArray = new Array(12).fill(0);
    for (const key in monthlyOrderCountsCurrentYear) {
      const intValue = parseInt(key);
      resultArray[intValue] = monthlyOrderCountsCurrentYear[key];
    }

    res.render("admin/dashboard", {
      todaysOrders,
      thisMonthsOrders,
      thisMonthsTotalRevenue,
      totalCustomersThisMonth,
      paymentMethods,
      monthlyOrderCountsCurrentYear: resultArray,
      Admin: admin,
    });
  } catch (error) {
    console.log("error/internalError", { error });
  }
};

const adminLogout = (req, res) => {
  try {
    if (req.session.admin) {
      req.session.destroy();
      res.redirect("/admin/dashboard");
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

// CUSTOMERS
const displayCustomers = async (req, res) => {
  const { query } = req.query;
  console.log(req.query);
  try {
    let users;
    if (query) {
      users = await Customer.find({
        name: { $regex: ".*" + query + ".*" },
        is_Admin: false,
        is_varified: true,
      });
      if (users.length > 0) {
        return res.render("admin/users", { users, query });
      }
    } else {
      users = await Customer.find({ is_varified: true, is_Admin: false });
      if (users.length > 0) {
        return res.render("admin/users", { users, query });
      }
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const UnblockTheUser = async (req, res) => {
  try {
    const { id } = req.query;
    const userUpdated1 = await Customer.updateOne(
      { _id: id },
      { $set: { is_block: false } }
    );
    if (userUpdated1) {
      return res.redirect("/admin/customers");
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const blockTheUser = async (req, res) => {
  try {
    const { id } = req.query;
    const userUpdated = await Customer.updateOne(
      { _id: id },
      { $set: { is_block: true } }
    );
    if (userUpdated) {
      return res.redirect("/admin/customers");
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const loadCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1; // Get page number from query parameters, default to 1
    const itemsPerPage = 10; // Set the number of items per page

    const totalOffers = await productCategory.countDocuments();
    const totalPages = Math.ceil(totalOffers / itemsPerPage);

    const offers = await productCategory
      .find()
      .skip((page - 1) * itemsPerPage)
      .limit(itemsPerPage)
      .exec();

    let search = req.query.search;

    if (search && search !== "") {
      categories = await productCategory
        .find({ categoryName: { $regex: search, $options: "i" } })
        .sort({ _id: -1 })
        .populate("offer");
      res.render("admin/productCategory", {
        categories,
        totalPages,
        currentPage: page,
      });
    } else {
      categories = await productCategory
        .find()
        .sort({ _id: -1 })
        .populate("offer");
      res.render("admin/productCategory", {
        categories,
        totalPages,
        currentPage: page,
      });
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const loadAddCategory = async (req, res) => {
  try {
    const offers = await Offer.find({ is_deleted: false });
    res.render("admin/addCategory", { message: "", offers: offers });
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const addProductcategory = async (req, res) => {
  try {
    const categoryName = req.body.categoryName.trim();
    const description = req.body.description.trim();
    const offers = await Offer.find({ is_deleted: false });
    if (!categoryName || !req.file || !description) {
      return res.render("admin/addCategory", {
        message: "Fill all fields.........",
        offers: offers,
      });
    }
    // Validation for category name length
    if (!categoryName || categoryName.length < 3 || categoryName.length > 50) {
      return res.render("admin/addCategory", {
        message: "Category name must be between 3 and 50 characters.",
        offers: offers,
      });
    }

    // Validation for description length
    if (!description || description.length < 3 || description.length > 500) {
      return res.render("admin/addCategory", {
        message: "Description must be between 3 and 500 characters.",
        offers: offers,
      });
    }

    // Validation for image file type
    if (!req.file || !req.file.mimetype.startsWith("image/")) {
      return res.render("admin/addCategory", {
        message: "Please upload a valid image file.",
        offers: offers,
      });
    }
    const exist = await productCategory.findOne({
      categoryName: { $regex: new RegExp(req.body.categoryName, "i") },
    });
    if (exist) {
      return res.render("admin/addCategory", {
        message: "category already exists..",
        offers: offers,
      });
    }

    if (!exist) {
      const category = new productCategory({
        categoryName: categoryName,
        description: description,
        image: {
          data: req.file.buffer,
          contentType: req.file.mimetype,
        },
      });

      if (req.body.offer) {
        const offer = Offer.findById(req.body.offer);
        if (offer.is_deleted === false) {
          category.offer = req.body.offer;
        }
      }
      await category.save();
      res.redirect("/admin/product/Category-management");
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const loadEditCategory = async (req, res) => {
  try {
    const offers = await Offer.find({ is_deleted: false });
    const { id } = req.params;
    const EditCategory = await productCategory
      .findById({ _id: id })
      .populate("offer");
    if (EditCategory) {
      return res.render("admin/editCategory", { EditCategory, id, offers});
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};
const EditCategory = async (req, res) => {
  const id = req.query.id;
  try {
    const trimmedCategoryName = req.body.Categoryname.trim();
    const trimmedDescription = req.body.description.trim();

    const editedCategory = await productCategory.findById(id);
    if (editedCategory) {
      const regex = new RegExp(`^${trimmedCategoryName}$`, 'i');
      const remainingCategories = await productCategory.find({
        _id: { $ne: id }, // Exclude the current category being edited
        categoryName: regex,
      });
      if (remainingCategories.length>0){
        return res.status(400).send("Category name must be unique.");
      }
      if(trimmedDescription.length>500){
        return res.status(400).send("Description must be less than 500 character.");
      }
      const categoryRegex = /^[a-zA-Z\s]+$/;
      if (!categoryRegex.test(trimmedCategoryName)) {
        return res.status(400).send("Category name should only contain characters.");
      }
  
      if (trimmedCategoryName.length > 50) {
        return res.status(400).send("Category name length should not exceed 50 characters.");
      }

      if (!req.file || !req.file.mimetype.startsWith("image/")) {
        return res.status(400).send("Please upload valid image file");
          
      }
  

      editedCategory.categoryName =  trimmedCategoryName;
      editedCategory.description = trimmedDescription;
      if (req.file) {
        editedCategory.image.data = req.file.buffer;
        editedCategory.image.contentType = req.file.mimetype;
      }
      if (req.body.offer === "Delete") {
        await product.updateMany(
          { category: id },
          { $set: { categoryOfferPrice: 0 } }
        );
        await productCategory.findByIdAndUpdate(id, { $unset: { offer: {} } });
      } else if (req.body.offer !== undefined && req.body.offer) {
        const offer = await Offer.findById(req.body.offer);
        if (offer.is_deleted === false) {
          await productCategory.findByIdAndUpdate(id, {
            $set: { offer: req.body.offer },
          });
          const products = await product.find({ category: id });
          for (let i = 0; i < products.length; i++) {
            let discountPercentage = offer.discount;
            let regularPrice = products[i].price;
            let offerPrice =
              regularPrice -
              Math.floor((discountPercentage / 100) * regularPrice);
            products[i].categoryOfferPrice = offerPrice;
            await products[i].save();
          }
        } else {
          await productCategory.findByIdAndUpdate(id, {
            $unset: { offer: {} },
          });
          const products = await product.find({ category: id });
          for (let i = 0; i < products.length; i++) {
            products[i].categoryOfferPrice = 0;
            await products[i].save();
          }
        }
      }
      await editedCategory.save();
      return res.redirect("/admin/product/Category-management");
    } else {
      return res.status(404);
    }
  } catch (error) {
    console.log(error.message);
  }
};

const deletecategory = async (req, res) => {
  try {
    const { id } = req.params;
    const deleteCategory = await productCategory.findByIdAndDelete({ _id: id });
    if (deleteCategory.offer) {
      await product.updateMany(
        { category: id },
        { $set: { categoryOfferPrice: 0 } }
      );
    }
    if (deleteCategory) {
      res.redirect("/admin/product/Category-management");
    }
  } catch (error) {
    res.render("error/internalError", { error });
    res.status(500).send("Internal Server Error");
  }
};

const deleteCategoryImg = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await productCategory.findByIdAndDelete(categoryId, {
      $unset: { image: {} },
    });
    console.log(categoryId);
    console.log(category);
    return res.redirect(`/admin/Category/${categoryId}/Edit-Category`);
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const loadProductPage = async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Get page number from query parameters, default to 1
  const itemsPerPage = 10; // Set the number of items per page
  const totalProducts = await product.countDocuments();
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  const query = req.query.search || "";
  console.log(req.query);
  try {
    let products;
    let len;

    if (query) {
      products = await product
        .find({ product_name: { $regex: query, $options: "i" } })
        .populate("offer")
        .populate("category");
      len = await product.find({
        product_name: { $regex: query, $options: "i" },
      });
    } else {
      products = await product
        .find()
        .populate("offer")
        .populate("category")
        .skip((page - 1) * itemsPerPage)
        .limit(itemsPerPage)
        .exec();
      len = await product.find();
    }
    if (products) {
      return res.render("admin/products", {
        products,
        len,
        totalPages,
        currentPage: page,
      });
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};
const loadProductCreate = async (req, res) => {
  try {
    const Categories = await productCategory.find();
    const offers = await Offer.find({ is_deleted: false });
    res.render("admin/addproduct", { message: "", Categories, offers });
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const createProduct = async (req, res) => {
  console.log("HAI");
  console.log(req.body);
  const offers = await Offer.find({ is_deleted: false });
  const Categories = await productCategory.find();
  const {
    productName,
    brandName,
    price,
    description,
    stockCount,
    category,
    availability,
    offer,
  } = req.body;

  try {
    let productname =productName.trim()
    let brandname = brandName.trim()
    let Description = description.trim()
    // Validate that required fields are provided
    if (!productname || !brandname || !price ||!Description || !stockCount ||!category ||!availability ) {
      return res.render("admin/addproduct", {
        message: "All fields are required. Please fill in all fields.",
        Categories,offers
      }); 
    }

    const productRegex = /^[a-zA-Z\s]+$/;
    if (!productRegex.test( productname,brandname)) {
      return res.render("admin/addproduct", {
        message: "product name and brandname should only contains characters.",
        Categories,offers
      });
    }
  
  if(productname.length<3 && productname.length>50){
    return res.render("admin/addproduct", {
      message: "product name should be in between 3 and 50 character.",
      Categories,offers
    });
  }

  if(stockCount < 0 || price < 0){
    return res.render("admin/addproduct", {
      message: "price and stockCount should be positive.",
      Categories,offers
    });
 }

 if(Description.length>500){
  return res.render("admin/addproduct", {
    message: "Description must be less than 500 character",
    Categories,offers
  });
 }
    
    let stock;

    if (availability === "true") {
      stock = true;
    } else {
      stock = false;
    }

    // Create the product
    const Product = new product({
      product_name: productname,
      brand_name: brandname,
      price: price,
      stock_count: stockCount,
      description:Description,
      category: category,
      in_stock: stock,
    });

    // Assuming req.files is an array of uploaded image files
    req.files.forEach((file) => {
      Product.image.push({ data: file.buffer, contentType: file.mimetype });
    });

    if (req.body.offer) {
      Product.offer = req.body.offer;
      const offerm = await Offer.findById(req.body.offer);
      if (offerm.is_deleted === false) {
        const regularPrice = req.body.price;
        const newPrice =
          regularPrice - Math.floor((offerm.discount / 100) * regularPrice);
        Product.offerPrice = newPrice;
      } else {
        Product.offerPrice = 0;
      }
    }

    const CategoryOffer = await productCategory.findById(category);
    if (CategoryOffer.offer) {
      const offerm = await Offer.findById(CategoryOffer.offer);
      if (offerm.is_deleted === false) {
        const discountPercentage = offerm.discount;
        const regularPrice = req.body.price;
        const newprice =
          regularPrice - Math.floor((discountPercentage / 100) * regularPrice);
        Product.categoryOfferPrice = newprice;
      } else {
        Product.categoryOfferPrice = 0;
      }
    }
    await Product.save();
    return res.redirect("/admin/product");
  } catch (error) {
    //    console.error(error);
    console.log(error.message);
    //    res.status(500).send("Error creating the product.");
  }
};

const productActivate = async (req, res) => {
  try {
    const id = req.params.id;
    const change = await product.updateOne(
      { _id: id },
      { $set: { is_delete: false } }
    );
    if (change) {
      return res.redirect("/admin/product");
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const productDeactivate = async (req, res) => {
  try {
    const id = req.params.id;
    const change = await product.updateOne(
      { _id: id },
      { $set: { is_delete: true } }
    );
    if (change) {
      return res.redirect("/admin/product");
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const loadProductEditPage = async (req, res) => {
  try {
    const id = req.params.id;
    const pro = await product.findOne({ _id: id });
    let Product;
    if (pro.offer) {
      Product = await product
        .findOne({ _id: id })
        .populate("offer")
        .populate("category");
    } else {
      Product = await product.findOne({ _id: id }).populate("category");
    }
    const Categories = await productCategory
      .find({ categoryName: { $ne: pro.category } })
      .populate("offer");
    const offers = await Offer.find({ is_deleted: false });
    res.render("admin/Edit", { Product, id, Categories, offers });
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const editProduct = async (req, res) => {
  console.log(req.body);
  const {
    productName,
    brandName,
    price,
    description,
    stockCount,
    category,
    availability,
    id,
    images: requestImages,
  } = req.body;
  try {
    let productname = productName.trim()
    let brandname= brandName.trim()
    let Description = description.trim() 
    let stock;

    if (availability === "true") {
      stock = true;
    } else {
      stock = false;
    }
   
   if(productname.length<3 && productname.length>50){
    return res.status(400).send("productname should be in between 3 and 50 character");
   }

   const productRegex = /^[a-zA-Z\s]+$/;
    if (!productRegex.test( productname,brandname)) {
      return res.status(400).send("productname and brandname should only contains character ");
    }
  
    if(stockCount < 0 || price < 0){
       return res.status(400).send("price and stockcount should be positive ");
    }
   
    if(Description.length>500){
      return res.status(400).send("Description doesnot exceed 500 character ");
    }

    const images = req.files;
    const productId = id;
    const updateFields = {
      product_name: productname,
      brand_name: brandname,
      price: price,
      stock_count: stockCount,
      description: Description,
    };

    if (req.body.category && req.body.category !== "") {
      const CategoresOffer = await productCategory.findById(req.body.category);
      if (CategoresOffer.offer) {
        const caOffer = await Offer.findById(CategoresOffer.offer);
        if (caOffer.is_deleted === false) {
          updateFields.category = req.body.category;
          updateFields.categoryOfferPrice =
            req.body.price -
            Math.floor((caOffer.discount / 100) * req.body.price);
        }
      } else {
        updateFields.categoryOfferPrice = 0;
        updateFields.category = req.body.category;
      }
    }
    if (req.body.offer && req.body.offer.length > 10) {
      updateFields.offer = req.body.offer;
      const proOffer = await Offer.findById(req.body.offer);
      if (proOffer.is_deleted === false) {
        updateFields.offerPrice =
          req.body.price -
          Math.floor((proOffer.discount / 100) * req.body.price);
      }
    }
    if (req.body.offer === "Delete") {
      await product.findByIdAndUpdate(productId, {
        $unset: { offer: 1 },
        $set: { offerPrice: 0 },
      });
    }
    const updatedProduct = await product.findByIdAndUpdate(
      productId,
      { $set: updateFields },
      { new: true }
    );

    if (req.files && req.files.length > 0) {
      // Assuming 'req.files' contains the uploaded image files
      req.files.forEach((file) => {
        updatedProduct.image.push({
          data: file.buffer,
          contentType: file.mimetype,
        });
      });
    }

    await updatedProduct.save();

    res.redirect("/admin/product");
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const deleteImgDelete = async (req, res) => {
  const id = req.params.id;
  const imageId = req.params.imageId;
  try {
    const deleteImg = await product.findByIdAndUpdate(
      { _id: id },
      { $pull: { image: { _id: imageId } } },
      { new: true }
    );

    if (deleteImg) {
      return res.redirect(`/admin/product/${req.params.id}/Edit`);
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const loadOrder = async (req, res) => {
  const perPage = 8; // Number of order per page
  const page = req.query.page || 1; // Get the current page from the query parameters (default to page !)
  const { customer, status } = req.query;
  try {
    let ordersQuery = Order.find().populate([
      { path: "products.product" },
      { path: "user" },
    ]);
    if (customer) {
      ordersQuery = ordersQuery
        .where("user.name")
        .regex(new RegExp(customer, "i"));
    }
    if (status) {
      ordersQuery = ordersQuery.where("status").equals(status);
    }

    const orders = await ordersQuery
      .sort({ orderDate: -1 }) // sort orderDate in descending order
      .skip((page - 1) * perPage) // skip orders on previous page
      .limit(perPage); // Limit the number of orders per page

    const totalOrders = await Order.countDocuments();
    const totalPages = Math.ceil(totalOrders / perPage);

    res.render("admin/order", {
      activePage: "orders",
      orders,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const updateActionOrder = async (req, res) => {
  const order = await Order.findById(req.query.orderId);
  const userData = await Customer.findById(order.user);
  try {
    if (req.query.action === "Delivered") {
      const foundCoupon = await Coupon.findOne({
        isActive: true,
        minimumPurchaseAmount: { $lte: order.totalAmount },
      }).sort({ minimumPurchaseAmount: -1 });

      console.log("ggg", foundCoupon);
      if (foundCoupon) {
        const couponExists = userData.earnedCoupons.some((coupon) =>
          coupon.coupon.equals(foundCoupon._id)
        );
        console.log(couponExists);
        // if(!couponExists){
        // for(let i of foundCoupon){

        userData.earnedCoupons.push({ coupon: foundCoupon._id });
        // }
      }
      await userData.save();
    }
    await Order.updateOne(
      { _id: req.query.orderId },
      { status: req.query.action }
    );

    res.redirect("/admin/order");
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const updateOrderCancel = async (req, res) => {
  try {
    const foundOrder = await Order.findById(req.query.orderId);
    for (let i = 0; i < foundOrder.products.length; i++) {
      foundOrder.products[i].isCancelled = true;
    }
    foundOrder.status = req.query.action;
    await foundOrder.save();
    res.redirect("/admin/order");
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const getreturnRequests = async (req, res) => {
  try {
    const ITEM_PER_PAGE = 4; // no of item to display per page
    const page = parseInt(req.query.page) || 1;
    const totalRequests = await Return.countDocuments();
    const returnRequests = await Return.find()
      .populate([
        { path: "user" },
        { path: "order" },
        { path: "product" },
        { path: "address" },
      ])
      .skip((page - 1) * ITEM_PER_PAGE) // calculate the number of items to skip
      .limit(ITEM_PER_PAGE);
    const totalPages = Math.ceil(totalRequests / ITEM_PER_PAGE);
    res.render("admin/returns", {
      activePage: "order",
      returnRequests,
      totalPages,
    });
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const returnRequsetActions = async (req, res) => {
  try {
    let totalAmount;
    const foundRequest = await Return.findById(req.body.request).populate(
      "product"
    );
    console.log("foundrequest:" + foundRequest);
    const foundOrder = await Order.findById(req.body.order);
    console.log("foundOrder:" + foundOrder);
    const currentProduct = foundOrder.products.find(
      (product) => product.product.toString() === req.body.product.toString()
    );
    console.log("currentProduct:" + currentProduct);
    if (currentProduct) {
      totalAmount = foundRequest.quantity * currentProduct.Price;
      console.log("totalAmount:" + totalAmount);
    }

    if (req.body.action === "approve") {
      foundRequest.status = "Approved";
      currentProduct.returnRequested = "Approved";
    } else if (req.body.action === "reject") {
      foundRequest.status = "Rejected";
      currentProduct.returnRequested = "Rejected";
    } else {
      const transactionData = {
        amount: foundOrder.totalAmount,
        description: "Order return.",
        type: "Credit",
      };

      console.log("wallet updating ", foundOrder.totalAmount);
      const currentUser = await Customer.updateOne(
        { _id: foundOrder.user },
        {
          $inc: { "wallet.balance": totalAmount },
          $push: { "wallet.transactions": transactionData },
        }
      );
      const EditProduct = await product.findOne({ _id: req.body.product });
      const currentStock = EditProduct.stock_count;
      EditProduct.stock_count = currentStock + foundRequest.quantity;
      await EditProduct.save();
      foundRequest.status = "Completed";
      currentProduct.returnRequested = "Completed";
    }
    await foundRequest.save();
    await foundOrder.save();
    res.redirect("/admin/return-requests");
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const loadCoupons = async (req, res) => {
  try {
    // pagination
    const page = req.query.page || 1;
    const pageSize = 8;
    const skip = (page - 1) * pageSize;
    const totalCoupons = await Coupon.countDocuments();

    const totalPages = Math.ceil(totalCoupons / pageSize);

    let foundCoupons;

    if (req.query.search) {
      foundCoupons = await Coupon.find({
        isActive: req.body.searchQuery === "1" ? true : false,
      });
      return res.status(200).json({
        couponDatas: foundCoupons,
      });
    } else {
      foundCoupons = await Coupon.find().skip(skip).limit(pageSize);
      res.render("admin/coupons", {
        activePage: "coupon",
        foundCoupons,
        filtered: req.query.search ? true : false,
        currentPage: page || 1,
        totalPages: totalPages || 1,
      });
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const getAddNewCoupon = (req, res) => {
  try {
    console.log("nnn");
    res.render("admin/newCoupons",{message:""});
  } catch (error) {
    res.render("error/internalError", { error: "" });
  }
};

function generateCouponCode() {
  const codeRegex = /^[A-Z0-9]{5,15}$/;
  let code = "";
  while (!codeRegex.test(code)) {
    code = Math.random().toString(36).substring(7);
  }
  return Coupon.findOne({ code }).then((existingCoupon) => {
    if (existingCoupon) {
      return generateCouponCode();
    }
    return code;
  });
}

const addNewCoupon = async (req, res) => {
  try {
    const {
      description,
      discountType,
      discountAmount,
      minimumPurchaseAmount,
      usageLimit,
    } = req.body;

    let Description = description.trim()

    if (! Description ||!discountType ||!discountAmount ||!minimumPurchaseAmount ||!usageLimit) {
      res.render("admin/newCoupons", { message: "All fields are required" });
    }
      if (discountType === "percentage" && discountAmount > 100) {
        return res.render("admin/newCoupon", {
          message: "Discount percentage is greater than 100",
        });
      }
      if (Description.length < 4 ||  Description.length > 100) {
        return res.render("admin/newCoupons", {
          message: "Description must be between 4 and 100 characters",
        });
      } 
         if( discountAmount<0 ||minimumPurchaseAmount<0 ||usageLimit<0 ){
          return res.render("admin/newCoupons", {
            message: "entered no should be positive",
          });
         }

        const uniqueCode = await generateCouponCode();
        const newCoupon = new Coupon({
          code: uniqueCode,
          discountType,
          Description,
          discountAmount,
          minimumPurchaseAmount,
          usageLimit,
        });
        await newCoupon.save();
        res.redirect("/admin/coupons");
      
    } catch (error) {
    res.render("error/internalError", { error });
  }
};

const couponAction = async (req, res) => {
  try {
    const state = req.body.state === "";
    console.log(state);
    const couponId = req.params.id;
    await Coupon.findByIdAndUpdate(couponId, { $set: { isActive: state } });
    res.redirect("/admin/coupons");
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const loadOfferPage = async (req, res) => {
  try {
    let query = req.query.query || "";
    let Offers;
    let len;
    if (query !== "") {
      Offers = await Offer.find({
        name: { $regex: query, $options: "i" },
      }).sort({ is_deleted: -1 });
      len = await Offer.find({ name: { $regex: query, $options: "i" } }).sort({
        is_deleted: -1,
      });
      return res.render("admin/offer", { Offers, query });
    } else {
      Offers = await Offer.find().sort({ is_deleted: -1 });
      len = await Offer.find().sort({ is_deleted: -1 });
      return res.render("admin/offer", { Offers, query });
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};
const loadAddOfferPage = async (req, res) => {
  try {
    return res.render("admin/addOffer",{message:""});
  } catch (error) {
    res.render("error/internalError", { error});
  }
};

const createOffer = async (req, res) => {
  const { name, discount, startingDate, expiryDate, status } = req.body;
  try {
     let Name = name.trim()
     let Status =status.trim()
     let Discount=discount.trim() 

      
    if (!Name || !Status ||!Discount ||!startingDate ||!expiryDate) {
      res.render("admin/addOffer", { message: "All fields are required" });
    }

     const existOffer = await Offer.findOne({ name: { $regex: new RegExp("^" + Name + "$", "i") } });
     if (existOffer !== null && existOffer) {
       return res.render("admin/addOffer", { message: "Offer already exists" });
     }
     if (isNaN(Discount) || typeof Discount !== 'number'|| Discount<0) {
      return res.render("admin/addOffer", { message: "Discount must be a valid positive number." });
    }
    if(Status.length>50){
      return res.render("admin/addOffer", { message: "Status should not exceed 50 character" });
    }

    const newOffer = new Offer({
       name:Name,
       discount:Discount,
       startingDate,
       expiryDate,
       status:Status,
    });
    await newOffer.save();
    return res.redirect("/admin/Offer");
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const loadOfferEdit = async (req, res) => {
  try {
    const offerID = req.params.id;
    const findOffer = await Offer.findById(offerID);
    if (findOffer) {
      findOffer.startingDateFormatted = findOffer.startingDate
        .toISOString()
        .split("T")[0];
      findOffer.expDateFormatted = findOffer.expiryDate
        .toISOString()
        .split("T")[0];
      res.render("admin/editOffer", { findOffer });
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const saveEditOffer = async (req, res) => {
  console.log(req.body);
  const updateData = req.body;

  if (updateData) {
    try {
      // Find the offer by its ID
      const findOffer = await Offer.findOne({ _id: updateData.offerID });

      if (!findOffer) {
        return res.status(404).send("Offer not found");
      }

      // Update offer details
      findOffer.name = updateData.name;
      findOffer.discount = updateData.discount;
      findOffer.startingDate = updateData.startingDate;
      findOffer.expiryDate = updateData.expiryDate;
      findOffer.status = updateData.status;

      // Save the updated offer
      await findOffer.save();

      // Find related categories using the offer ID
      const categories = await productCategory.find(
        { offer: updateData.offerID },
        { _id: 1 }
      );

      // Update products with the new prices
      const products = await product.find({ offer: updateData.offerID });

      for (let i = 0; i < products.length; i++) {
        const price = products[i].price;
        const newPrice =
          price - Math.floor((updateData.discount / 100) * price);
        products[i].offerPrice = newPrice;

        // Check if the product's category is in the related categories
        if (
          categories.some((category) =>
            category._id.equals(products[i].category)
          )
        ) {
          products[i].categoryOfferPrice = newPrice;
        }

        // Save the updated product
        await products[i].save();
      }

      // Update category-related products
      for (let i = 0; i < categories.length; i++) {
        const categoryProducts = await product.find({
          category: categories[i],
        });

        for (let j = 0; j < categoryProducts.length; j++) {
          const product = categoryProducts[j];
          const newPrice =
            product.price -
            Math.floor((updateData.discount / 100) * product.price);
          product.categoryOfferPrice = newPrice;

          // Save the updated product
          await product.save();
        }
      }

      // Save the offer once more
      await findOffer.save();

      // Redirect to the Offer page
      return res.redirect("/admin/Offer/");
    } catch (error) {
      res.render("error/internalError", { error });
    }
  }
};

const deleteOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    const findExpiredOffers = await Offer.findById(offerId);
    if (findExpiredOffers) {
      findExpiredOffers.is_deleted = true;
      const offerId = findExpiredOffers._id;
      await product.updateMany(
        { offer: offerId },
        {
          $unset: { offer: 1 },
          $set: { offerPrice: 0 },
        }
      );
      let categoryIds = await productCategory.find({ offer: offerId });
      const OfferCategory = await productCategory.updateMany(
        { offer: offerId },
        { $unset: { offer: 1 } }
      );
      if (OfferCategory.modifiedCount > 0) {
        await product.updateMany(
          { category: { $in: categoryIds } },
          { $set: { categoryOfferPrice: 0 } }
        );
      }
      await findExpiredOffers.save();
      return res.redirect("/admin/Offer/");
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const activeOffer = async (req, res) => {
  try {
    const id = req.params.id;
    const updateOffer = await Offer.findByIdAndUpdate(id, {
      is_deleted: false,
    });
    if (updateOffer) {
      return res.redirect("/admin/Offer");
    }
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const getBanner = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.render("admin/banners", { banners });
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const getAddBanner = (req, res) => {
  try {
    res.render("admin/addBanner");
  } catch (error) {
    res.render("error/internalError", { error });
  }
};
const addBanner = async (req, res) => {
  try {
    console.log("...here......");
    const { name, description, banner } = req.body;
    const newBanner = await Banner.create({
      name,
      banner,
      description,
    });
    if (!newBanner) {
      res.redirect("/admin/banner/banner");
    }

    res.redirect("/admin/banner");
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const loadEditBanner = async (req, res) => {
  try {
    const bannerId = req.params.id;
    const banner = await Banner.findById(bannerId);

    res.render("admin/editBanner", { banner });
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const editBanner = async (req, res) => {
  try {
    const bannerId = req.params.id;
    console.log(req.body);
    const updatedBanner = await Banner.findByIdAndUpdate(bannerId, req.body);
    updatedBanner.name = req.body.name;
    updatedBanner.description = req.body.description;
    updatedBanner.banner = req.body.banner;
    await updatedBanner.save();
    if (!updatedBanner) {
      res.redirect("/admin/banner/banner");
    }
    res.redirect("/admin/banner");
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const deleteBanner = async (req, res) => {
  try {
    const bannerId = req.params.id;
    await Banner.deleteOne({ _id: bannerId });
    res.redirect("/admin/banner");
  } catch (error) {
    res.render("error/internalError", { error });
  }
};

const getSalesReport = async (req, res) => {
  try {
    let startOfMonth;
    let endOfMonth;
    if (req.query.filtered) {
      startOfMonth = new Date(req.body.from);
      endOfMonth = new Date(req.body.upto);
      endOfMonth.setHours(23, 59, 59, 999);
    } else {
      const today = new Date();
      startOfMonth = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
        0,
        0,
        0
      );
      endOfMonth = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0,
        23,
        59,
        59
      );
    }

    const filteredOrders = await Order.aggregate([
      {
        $match: {
          status: "Delivered",
          orderDate: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        },
      },
      {
        $unwind: "$products", // unwind the products array
      },
      {
        $lookup: {
          from: "products",
          localField: "products.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $addFields: {
          "products.productInfo": {
            $arrayElemAt: ["$productInfo", 0], // Get the first (and only) element of the "productInfo" array
          },
        },
      },
      {
        $match: {
          "products.returnRequested": { $in: ["Nil", "Rejected"] },
        },
      },
      {
        $lookup: {
          from: "customers",
          localField: "user",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          _id: 1,
          userInfo: 1,
          totalAmount: 1,
          paymentMethod: 1,
          deliveryAddress: 1,
          status: 1,
          orderDate: 1,
          deliveryDate: 1,
          "products.quantity": 1,
          "products.isCancelled": 1,
          "products.returnRequested": 1,
          "products.productInfo": 1,
        },
      },
    ]);

    res.render("admin/salesReport", {
      salesReport: filteredOrders,
    });
  } catch (error) {
    console.log(error.message);
  }
};



module.exports = {
  loadAdminLogin,
  loginValidation,
  adminValid,
  loadDash,
  displayCustomers,
  loadCategory,
  loadAddCategory,
  addProductcategory,
  deletecategory,
  loadProductPage,
  loadProductCreate,
  createProduct,
  productActivate,
  productDeactivate,
  UnblockTheUser,
  blockTheUser,
  loadProductEditPage,
  editProduct,
  adminLogout,
  loadOrder,
  updateActionOrder,
  updateOrderCancel,
  getreturnRequests,
  returnRequsetActions,
  loadCoupons,
  getAddNewCoupon,
  addNewCoupon,
  couponAction,
  deleteImgDelete,
  loadEditCategory,
  loadOfferPage,
  loadAddOfferPage,
  createOffer,
  loadOfferEdit,
  saveEditOffer,
  deleteOffer,
  activeOffer,
  EditCategory,
  deleteCategoryImg,
  getBanner,
  getAddBanner,
  addBanner,
  getSalesReport,
  loadEditBanner,
  editBanner,
  deleteBanner,
};
