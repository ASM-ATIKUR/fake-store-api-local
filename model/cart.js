const mongoose = require('mongoose');
const schema = mongoose.Schema;

// A cart line references the catalog rather than embedding it, so price/title
// changes on a product are reflected everywhere. priceAtAdd is the one snapshot:
// what the product cost when it was put in the cart.
const cartProductSchema = new schema(
	{
		productId: {
			type: Number,
			required: true,
		},
		quantity: {
			type: Number,
			required: true,
			min: 1,
			validate: {
				validator: Number.isInteger,
				message: 'quantity must be a whole number',
			},
		},
		// deliberately optional: seed.js inserts upstream carts verbatim and
		// upstream fakestoreapi carries no price on cart lines
		priceAtAdd: {
			type: Number,
			min: 0,
		},
	},
	{ _id: false }
);

// productId is an app-level Number, not an _id, so the join needs an explicit
// foreignField. Opt-in via .populate('products.product').
cartProductSchema.virtual('product', {
	ref: 'product',
	localField: 'productId',
	foreignField: 'id',
	justOne: true,
});

cartProductSchema.virtual('subtotal').get(function () {
	return this.priceAtAdd == null ? undefined : this.priceAtAdd * this.quantity;
});

const cartSchema = new schema({
	id: {
		type: Number,
		required: true,
		unique: true,
	},
	userId: {
		type: Number,
		required: true,
		index: true,
	},
	date: {
		type: Date,
		required: true,
		default: Date.now,
	},
	products: {
		type: [cartProductSchema],
		validate: {
			validator: (products) =>
				new Set(products.map((p) => p.productId)).size === products.length,
			message: 'a product may only appear once in a cart',
		},
	},
});

cartSchema.virtual('user', {
	ref: 'user',
	localField: 'userId',
	foreignField: 'id',
	justOne: true,
});

module.exports = mongoose.model('cart', cartSchema);
