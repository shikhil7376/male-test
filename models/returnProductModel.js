const mongoose = require("mongoose");

const returnSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
    condition: {
        type: String,
        required: true,
    },
    address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        required: true,
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Completed'],
        default: 'Pending',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
})
const Return =mongoose.model('Return',returnSchema)

module.exports=Return