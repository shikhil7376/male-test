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
      res.render("admin/adminlogin");
    } else {
      res.redirect("admin/dashboard");
    }
  } catch (error) {
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
  }
};

const adminLogout = (req, res) => {
  try {
    if (req.session.admin) {
      req.session.destroy();
      res.redirect("/admin/dashboard");
    }
  } catch (error) {
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
  }
};

const loadAddCategory = async (req, res) => {
  try {
    const offers = await Offer.find({ is_deleted: false });
    res.render("admin/addCategory", { message: "", offers: offers });
  } catch (error) {
    console.log(error.message);
  }
};

const addProductcategory = async (req, res) => {
  try {
    console.log(req.body);
    if (!req.body.categoryName || !req.file) {
      req.flash("error", "Fill all fields.........");
      return res.redirect("/admin/product/add-category");
    }
    // Validation for category name length
    if (
      !req.body.categoryName ||
      req.body.categoryName.length < 3 ||
      req.body.categoryName.length > 50
    ) {
      req.flash("error", "Category name must be between 3 and 50 characters.");
      return res.redirect("/admin/product/add-category");
    }

    // Validation for description length
    if (!req.body.description || req.body.description.length > 500) {
      req.flash("error", "Description must be less than 500 characters.");
      return res.redirect("/admin/product/add-category");
    }

    // Validation for image file type
    if (!req.file || !req.file.mimetype.startsWith("image/")) {
      req.flash("error", "Please upload a valid image file.");
      return res.redirect("/admin/product/add-category");
    }
    const exist = await productCategory.findOne({
      categoryName: { $regex: new RegExp(req.body.categoryName, "i") },
    });
    if (!exist) {
      const category = new productCategory({
        categoryName: req.body.categoryName,
        description: req.body.description,
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
    console.error(error.message);
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
      return res.render("admin/editCategory", { EditCategory, id, offers });
    }
  } catch (error) {
    console.log(error.message);
  }
};

const EditCategory = async (req, res) => {
  const id = req.query.id;
  try {
    const editedCategory = await productCategory.findById(id);
    if (editedCategory) {
      editedCategory.categoryName = req.body.Categoryname;
      editedCategory.description = req.body.description;
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
    console.log(error.message);
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
    console.log(error.message);
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
        .populate("category")
      len = await product.find({
        product_name: { $regex: query, $options: "i" },
      });
    } else {
      products = await product.find().populate("offer").populate("category")
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
    console.log(error.message);
  }
};
const loadProductCreate = async (req, res) => {
  try {
    const Categories = await productCategory.find();
    const offers = await Offer.find({ is_deleted: false });
    res.render("admin/addproduct", { message: "", Categories, offers });
  } catch (error) {
    console.log(error.message);
  }
};
const createProduct = async (req, res) => {
  console.log("HAI");
  console.log(req.body);
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
    // Validate that required fields are provided
    if (!productName || !brandName) {
      return res.render("admin/addproduct", {
        message: "All fields are required. Please fill in all fields.",
        Categories,
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
      product_name: productName,
      brand_name: brandName,
      price: price,
      stock_count: stockCount,
      description: description,
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
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
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
    let stock;

    if (availability === "true") {
      stock = true;
    } else {
      stock = false;
    }
    // ...
    const images = req.files;
    const productId = id;
    const updateFields = {
      product_name: productName,
      brand_name: brandName,
      price: price,
      stock_count: stockCount,
      description: description,
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
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
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
    console.log(error.message);
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
    res.render("admin/newCoupons");
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
    if (
      !description ||
      !discountType ||
      !discountAmount ||
      !minimumPurchaseAmount ||
      !usageLimit
    ) {
      res.render("admin/newCoupons", { error: "All fields are required" });
    } else {
      if (discountType === "percentage" && discountAmount > 100) {
        return res.render("admin/newCoupon", {
          error: "Discount percentage is greater than 100",
        });
      }
      if (description.length < 4 || description.length > 100) {
        return res.render("admin/newCoupons", {
          error: "Description must be between 4 and 100 characters",
        });
      } else {
        const uniqueCode = await generateCouponCode();
        const newCoupon = new Coupon({
          code: uniqueCode,
          discountType,
          description,
          discountAmount,
          minimumPurchaseAmount,
          usageLimit,
        });
        await newCoupon.save();
        res.redirect("/admin/coupons");
      }
    }
  } catch (error) {
    console.log(error.message);
  }
};

const couponAction = async (req, res) => {
  try {
    console.log(">>>>here");
    const state = req.body.state === "";
    console.log(state);
    const couponId = req.params.id;
    await Coupon.findByIdAndUpdate(couponId, { $set: { isActive: state } });
    res.redirect("/admin/coupons");
  } catch (error) {
    console.log(error.message);
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
    console.log(error.message);
  }
};
const loadAddOfferPage = async (req, res) => {
  try {
    return res.render("admin/addOffer");
  } catch (error) {
    console.log(error.message);
  }
};

const createOffer = async (req, res) => {
  const { name, discount, startingDate, expiryDate, status } = req.body;
  try {
    const existOffer = await Offer.findOne({ name });
    if (existOffer !== null && existOffer) {
      return res.redirect("/admin/offer/create");
    }
    const newOffer = new Offer({
      name,
      discount,
      startingDate,
      expiryDate,
      status,
    });
    await newOffer.save();
    return res.redirect("/admin/Offer");
  } catch (error) {
    console.log(error.message);
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
    console.log(error.message);
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
      console.error(error);
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
    console.log(error.message);
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
    console.log(error.message);
  }
};

const getBanner = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.render("admin/banners", { banners });
  } catch (error) {
    console.log(error.message);
  }
};

const getAddBanner = (req, res) => {
  try {
    res.render("admin/addBanner");
  } catch (error) {
    console.log(error.message);
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
    console.log(error.messsage);
  }
};

const loadEditBanner = async (req, res) => {
  try {
    const bannerId = req.params.id;
    const banner = await Banner.findById(bannerId);

    res.render("admin/editBanner", { banner });
  } catch (error) {
    console.log(error.message);
  }
};

const editBanner = async (req, res) => {
  try {
    const bannerId = req.params.id;
    console.log(req.body);
    const updatedBanner = await Banner.findByIdAndUpdate(bannerId, req.body);
    updatedBanner.name = req.body.name;
    updatedBanner.description = req.body.description
    updatedBanner.banner = req.body.banner
     await updatedBanner.save();
    if (!updatedBanner) {
      res.redirect("/admin/banner/banner");
    }
    res.redirect("/admin/banner");
  } catch (error) {
    console.log(error.message);
  }
};

const deleteBanner = async (req, res) => {
  try {
    const bannerId = req.params.id;
    await Banner.deleteOne({ _id: bannerId });
    res.redirect("/admin/banner");
  } catch (error) {
    console.log(error.message);
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
    console.log(filteredOrders);
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
