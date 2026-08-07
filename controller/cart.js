const Cart = require('../model/cart');
const Product = require('../model/product');
const saveWithFreshId = require('../util/save');
const { forbidden } = require('../util/auth');

// the router already turned away everyone but customers, so ownership is the
// only question left: no role can reach a cart that isn't its own
const isMine = (req, userId) => Number(req.user.id) === Number(userId);

// strips the mongo ids the API never exposes
const toResponse = (cart) => {
	const cartObj = cart.toObject();
	delete cartObj._id;
	cartObj.products = cartObj.products.map(({ _id, ...p }) => p);
	return cartObj;
};

// the caller's active cart: most recent by date, newest id as tie-break.
// seeded users own several carts, so "my cart" needs a deterministic pick.
const findMyCart = (userId) => Cart.findOne({ userId }).sort({ date: -1, id: -1 });

// retries if a parallel request grabbed the same id first — model/cart.js has a
// unique index on it, so the collision surfaces as a duplicate-key error
const createEmptyCart = (userId) =>
	saveWithFreshId(Cart, (id) => new Cart({ id, userId, date: new Date(), products: [] }));

const myCartOrNew = (userId) =>
	findMyCart(userId).then((cart) => cart || createEmptyCart(userId));

const failed = (res) => (err) =>
	res.status(err.name === 'ValidationError' ? 400 : 500).json({
		status: 'error',
		message: err.message,
	});

module.exports.getAllCarts = (req, res) => {
	const limit = Number(req.query.limit) || 0;
	const sort = req.query.sort == 'desc' ? -1 : 1;
	const startDate = req.query.startdate || new Date('1970-1-1');
	const endDate = req.query.enddate || new Date();

	// a customer only ever sees their own carts
	const filter = {
		userId: req.user.id,
		date: { $gte: new Date(startDate), $lt: new Date(endDate) },
	};

	const listCarts = () =>
		Cart.find(filter).select('-_id -products._id').limit(limit).sort({ id: sort });

	// a shopper always has somewhere to put things. The count deliberately ignores
	// the date filter: endDate was captured above, so a cart created now would fall
	// outside it — and a narrow date query must not mint a cart on every call.
	Cart.countDocuments({ userId: req.user.id })
		.then((owned) => {
			if (owned === 0) {
				return createEmptyCart(req.user.id).then((cart) => [toResponse(cart)]);
			}
			return listCarts();
		})
		.then((carts) => res.json(carts))
		.catch(failed(res));
};

module.exports.getCartsbyUserid = (req, res) => {
	const userId = req.params.userid;
	const startDate = req.query.startdate || new Date('1970-1-1');
	const endDate = req.query.enddate || new Date();

	if (!isMine(req, userId)) {
		return forbidden(res, 'you can only access your own carts');
	}

	Cart.find({
		userId,
		date: { $gte: new Date(startDate), $lt: new Date(endDate) },
	})
		.select('-_id -products._id')
		.then((carts) => {
			res.json(carts);
		})
		.catch((err) => {
			res.status(500).json({ status: 'error', message: err.message });
		});
};

module.exports.getSingleCart = (req, res) => {
	const id = req.params.id;
	Cart.findOne({
		id,
	})
		.then((cart) => {
			if (!cart) {
				return res.status(404).json({
					status: 'error',
					message: 'cart not found',
				});
			}
			if (!isMine(req, cart.userId)) {
				return forbidden(res, 'you can only access your own carts');
			}
			res.json(toResponse(cart));
		})
		.catch((err) => {
			res.status(500).json({ status: 'error', message: err.message });
		});
};

module.exports.addProductToCart = (req, res) => {
	if (!req.body || req.body.productId == null) {
		return res.status(400).json({
			status: 'error',
			message: 'a productId should be provided',
		});
	}

	const productId = Number(req.body.productId);
	const quantity = req.body.quantity == null ? 1 : Number(req.body.quantity);

	// the catalog lookup both validates the product and supplies the price,
	// so a client can never name its own
	Product.findOne({ id: productId })
		.select('id price')
		.then((product) => {
			if (!product) {
				res.status(404).json({
					status: 'error',
					message: 'product not found',
				});
				return null;
			}

			return myCartOrNew(req.user.id).then((cart) => {
				const line = cart.products.find((p) => p.productId === productId);
				if (line) {
					// adding the same item again bumps the quantity; the schema
					// rejects a duplicate productId, and priceAtAdd stays the
					// snapshot from when it first went in
					line.quantity += quantity;
				} else {
					cart.products.push({ productId, quantity, priceAtAdd: product.price });
				}
				return cart.save();
			});
		})
		.then((cart) => {
			if (cart) {
				res.json(toResponse(cart));
			}
		})
		.catch(failed(res));
};

module.exports.editProductInCart = (req, res) => {
	if (!req.body || req.body.quantity == null) {
		return res.status(400).json({
			status: 'error',
			message: 'a quantity should be provided',
		});
	}

	const productId = Number(req.params.productId);

	findMyCart(req.user.id)
		.then((cart) => {
			if (!cart) {
				res.status(404).json({
					status: 'error',
					message: 'you have no cart',
				});
				return null;
			}
			const line = cart.products.find((p) => p.productId === productId);
			if (!line) {
				res.status(404).json({
					status: 'error',
					message: 'product not found in cart',
				});
				return null;
			}
			// quantity is the only editable field: priceAtAdd is a snapshot and
			// productId identifies the line
			line.quantity = Number(req.body.quantity);
			return cart.save();
		})
		.then((cart) => {
			if (cart) {
				res.json(toResponse(cart));
			}
		})
		.catch(failed(res));
};

module.exports.deleteCartProduct = (req, res) => {
	const productId = Number(req.params.productId);

	// resolving the cart from the token makes reaching someone else's impossible
	findMyCart(req.user.id)
		.then((cart) => {
			if (!cart) {
				res.status(404).json({
					status: 'error',
					message: 'you have no cart',
				});
				return null;
			}
			const product = cart.products.find((p) => p.productId === productId);
			if (!product) {
				res.status(404).json({
					status: 'error',
					message: 'product not found in cart',
				});
				return null;
			}
			cart.products = cart.products.filter((p) => p.productId !== productId);
			return cart.save();
		})
		.then((cart) => {
			if (cart) {
				res.json(toResponse(cart));
			}
		})
		.catch(failed(res));
};

module.exports.deleteCart = (req, res) => {
	if (req.params.id == null) {
		res.json({
			status: 'error',
			message: 'cart id should be provided',
		});
	} else {
		// load first so ownership can be checked before anything is removed
		Cart.findOne({ id: req.params.id })
			.then((cart) => {
				if (!cart) {
					res.status(404).json({
						status: 'error',
						message: 'cart not found',
					});
					return null;
				}
				if (!isMine(req, cart.userId)) {
					forbidden(res, 'you can only delete your own carts');
					return null;
				}
				return Cart.findOneAndDelete({ id: req.params.id });
			})
			.then((cart) => {
				if (cart) {
					res.json(toResponse(cart));
				}
			})
			.catch(failed(res));
	}
};
