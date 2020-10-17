const { Schema, model, Types } = require('mongoose');
const {Product} = require('./index');

const orderSchema = new Schema({
    purchaseDate: {
        type: Date,
        default: Date.now
    },
    products: [
        {
            type: Types.ObjectId,
            ref: 'Product'
        }
    ]
});


module.exports = model('Order', orderSchema);
