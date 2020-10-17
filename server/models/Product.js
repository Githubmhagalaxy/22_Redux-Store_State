const { Schema, model, Types } = require('mongoose');
const {Category} = require('./index')


const productSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: String,
    image: String,
    price: {
        type: Number,
        required: true,
        min: 0.99
    },
    quantity: {
        type: Number,
        min: 0,
        default: 0
    },
    category: {
        type: Types.ObjectId,
        ref: "Category",
        required: true
    }
});


module.exports = model('Product', productSchema);
