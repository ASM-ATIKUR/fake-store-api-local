const Cart = require('../model/cart');
const nextId = require('../util/id');
const toDotPaths = require('../util/flatten');
const { isOwnerOrAdmin, forbidden } = require('../util/auth');

// strips the mongo ids the API never exposes
const toResponse = (cart) => {
	const cartObj = cart.toObject();
	delete cartObj._id;
	cartObj.products = cartObj.products.map(({ _id, ...p }) => p);
	return cartObj;
};

module.exports.getAllCarts = (req, res) => {
	const limit = Number(req.query.limit) || 0;
	const sort = req.query.sort == 'desc' ? -1 : 1;
	const startDate = req.query.startdate || new Date('1970-1-1');
	const endDate = req.query.enddate || new Date();

	const filter = {
		date: { $gte: new Date(startDate), $lt: new Date(endDate) },
	};
	// a customer only ever sees their own carts
	if (req.user.role !== 'admin') {
		filter.userId = req.user.id;
	}

	Cart.find(filter)
		.select('-_id -products._id')
		.limit(limit)
		.sort({ id: sort })
		.then((carts) => {
			res.json(carts);
		})
		.catch((err) => {
			res.status(500).json({ status: 'error', message: err.message });
		});
};

module.exports.getCartsbyUserid = (req, res) => {
	const userId = req.params.userid;
	const startDate = req.query.startdate || new Date('1970-1-1');
	const endDate = req.query.enddate || new Date();

	if (!isOwnerOrAdmin(req, userId)) {
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
			if (!isOwnerOrAdmin(req, cart.userId)) {
				return forbidden(res, 'you can only access your own carts');
			}
			res.json(toResponse(cart));
		})
		.catch((err) => {
			res.status(500).json({ status: 'error', message: err.message });
		});
};

module.exports.addCart = (req, res) => {
	if (!req.body || !req.body.userId || !req.body.products) {
		res.json({
			status: 'error',
			message: 'data is undefined',
		});
	} else if (!isOwnerOrAdmin(req, req.body.userId)) {
		forbidden(res, 'you can only create carts for yourself');
	} else {
		nextId(Cart)
			.then((id) =>
				new Cart({
					id,
					userId: req.body.userId,
					date: req.body.date || new Date(),
					products: req.body.products,
				}).save()
			)
			.then((cart) => {
				res.json(toResponse(cart));
			})
			.catch((err) =>
				res.status(err.name === 'ValidationError' ? 400 : 500).json({
					status: 'error',
					message: err.message,
				})
			);
	}
};

module.exports.editCart = (req, res) => {
	if (!req.body || req.params.id == null) {
		res.json({
			status: 'error',
			message: 'something went wrong! check your sent data',
		});
	} else {
		delete req.body.id;
		// load first so ownership can be checked before anything is mutated
		Cart.findOne({ id: req.params.id })
			.then((cart) => {
				if (!cart) {
					res.status(404).json({
						status: 'error',
						message: 'cart not found',
					});
					return null;
				}
				if (!isOwnerOrAdmin(req, cart.userId)) {
					forbidden(res, 'you can only modify your own carts');
					return null;
				}
				// a customer cannot hand their cart to someone else
				if (req.user.role !== 'admin') {
					delete req.body.userId;
				}
				return Cart.findOneAndUpdate({ id: req.params.id }, toDotPaths(req.body), {
					new: true,
				});
			})
			.then((cart) => {
				if (cart) {
					res.json(toResponse(cart));
				}
			})
			.catch((err) => {
				res.status(500).json({ status: 'error', message: err.message });
			});
	}
};

module.exports.deleteCartProduct = (req, res) => {
	if (req.params.id == null || req.params.productId == null) {
		res.status(400).json({
			status: 'error',
			message: 'cart id and product id should be provided',
		});
	} else {
		const cartId = req.params.id;
		const productId = Number(req.params.productId);

		Cart.findOne({ id: cartId })
			.then((cart) => {
				if (!cart) {
					res.status(404).json({
						status: 'error',
						message: 'cart not found',
					});
					return null;
				}
				if (!isOwnerOrAdmin(req, cart.userId)) {
					forbidden(res, 'you can only modify your own carts');
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
			.catch((err) => {
				res.status(500).json({ status: 'error', message: err.message });
			});
	}
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
				if (!isOwnerOrAdmin(req, cart.userId)) {
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
			.catch((err) => {
				res.status(500).json({ status: 'error', message: err.message });
			});
	}
};
