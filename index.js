require("dotenv").config();
const express = require("express");
const session = require("express-session");
const nocache = require("nocache");
const customerRoute = require("./routes/customerRoute");
const adminRoute = require("./routes/adminRoute");
const methodOverride = require("method-override");
const path = require("path");
const flash = require('connect-flash');
const app = express();
const connectDB = require("./controllers/utils/mongoConfig");
app.use(methodOverride("_method"));
app.set("views", path.join(__dirname,'views'));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(nocache());
app.use(
  session({
    secret: "uuytytuytyv",
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.static("public"));
app.use(flash());
app.use("/", customerRoute);
app.use("/admin", adminRoute);
app.use((req,res,next)=>{
  res.status(404).render('user/404')
})

connectDB();

const PORT = process.env.PORT
app.listen(PORT, () => console.log(`server running....${PORT}`));
