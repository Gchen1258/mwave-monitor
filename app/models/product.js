const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
    //_id: mongoose.Schema.Types.ObjectId,
    productTitle: {
        type: String,
    },
    productPrice: {
        type: String,
    },
    productGroup: {
        type: String,
    },
    productImage: {
        type: String,
    },
    productLink: {
        type: String,
    },
    meetNgreet: {
      type: Boolean,
    },
    // instock: {
    //     type: Boolean,
    // }
});

module.exports = mongoose.model('product', productSchema);

