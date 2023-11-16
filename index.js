require('dotenv').config();
const express=require('express')
const path=require('path')
const session=require('express-session')
const nocache=require('nocache')
const http = require('http');
const passport = require('passport');
const customerRoute=require('./routes/customerRoute')
const adminRoute=require('./routes/adminRoute')
const mongoose=require('mongoose')
const socketio = require('./middleware/SocketAuth')
const socketIo = require('socket.io');

const app=express()
const server = http.createServer(app);

app.set('view engine','ejs')
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(nocache())
app.use(session({
    secret:'uuytytuytyv', 
    resave:false,
    saveUninitialized:true
}))
app.use(express.static('public'))

app.use('/',customerRoute)
app.use('/admin',adminRoute)



mongoose
.connect('mongodb://127.0.0.1:27017/MALE_FASHION')
.then(()=>console.log("DATABASE CONNECTED"))
.catch((error)=>console.log(error))

// const { io, socketMiddleware } = socketio(server, session);
// app.use(socketMiddleware);

const PORT=3008
app.listen(PORT,()=>console.log("server running..."))

