const Customer = require("../models/customerModel");

const socketIo = require('socket.io');


const initSocketMiddleware = (server) => {
    console.log("socket")
    const io = socketIo(server);
    
    const connectedClients = {};

  io.use((socket, next) => {
    const session = socket.request.session;

    console.log(session, 'session')
    
    if (session && session.user) {
        // Attach the user information to the socket
        socket.userId = session.user;
        connectedClients[session.user] = socket.id;
    }

    next();
});

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(userId, 'user')
    connectedClients[userId] = socket.id;
    console.log("Socket connected");

    socket.on('disconnect', () => {
        delete connectedClients[userId];
        console.log("Socket disconnected");
    });

    // Listen for admin blocking a user
    socket.on('blockUser', (blockedUserId) => {
        const blockedUserSocketId = connectedClients[blockedUserId];
        if (blockedUserSocketId) {
            io.to(blockedUserSocketId).emit('userBlocked');
        }
    });
});


const socketMiddleware = async (req, res, next) => {
    console.log("checking");
    const currentUser = await Customer.findById(req.session.user);

    if (currentUser && currentUser.blocked) {
        // Notify the user's socket to disconnect
        const userSocketId = connectedClients[req.session.user];
        if (userSocketId) {
            io.to(userSocketId).emit('userBlocked');
        }

        req.session.user = null;
        return res.redirect("/user-Login");
    } else {
        console.log("user not blocked");
    }

    next();
};


  return { io, socketMiddleware };
};

module.exports = initSocketMiddleware;
