
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
  offerName: {
    type: String,
    require: true,
  },
  description: {
    type: String,
    minLength: 4,
    maxLength: 100,
},
  discount: Number,
  startingDate: { type: Date, default: Date.now },
  endingDate: Date,
  is_delete: {
    type: Boolean,
    default: false,
  },
});

const Offer = mongoose.model('Offer', offerSchema);

module.exports = Offer;
