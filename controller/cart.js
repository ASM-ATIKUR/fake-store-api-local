const Cart = require('../model/cart');
const nextId = require('../util/id');
const toDotPaths = require('../util/flatten');

module.exports.getAllCarts = (req, res) => {
	const limit = Number(req.query.limit) || 0;
	const sort = req.query.sort == 'desc' ? -1 : 1;
	const startDate = req.query.startdate || new Date('1970-1-1');
	const endDate = req.query.enddate || new Date();

	console.log(startDate, endDate);

	Cart.find({
		date: { $gte: new Date(startDate), $lt: new Date(endDate) },
	})
		.select('-_id -products._id')
		.limit(limit)
		.sort({ id: sort })
		.then((carts) => {
			res.json(carts);
		})
		.catch((err) => console.log(err));
};

module.exports.getCartsbyUserid = (req, res) => {
	const userId = req.params.userid;
	const startDate = req.query.startdate || new Date('1970-1-1');
	const endDate = req.query.enddate || new Date();

	console.log(startDate, endDate);
	Cart.find({
		userId,
		date: { $gte: new Date(startDate), $lt: new Date(endDate) },
	})
		.select('-_id -products._id')
		.then((carts) => {
			res.json(carts);
		})
		.catch((err) => console.log(err));
};

module.exports.getSingleCart = (req, res) => {
	const id = req.params.id;
	Cart.findOne({
		id,
	})
		.select('-_id -products._id')
		.then((cart) => res.json(cart))
		.catch((err) => console.log(err));
};

module.exports.addCart = (req, res) => {
	if (!req.body || !req.body.userId || !req.body.products) {
		res.json({
			status: 'error',
			message: 'data is undefined',
		});
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
				const cartObj = cart.toObject();
				delete cartObj._id;
				cartObj.products = cartObj.products.map(({ _id, ...p }) => p);
				res.json(cartObj);
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
		Cart.findOneAndUpdate({ id: req.params.id }, toDotPaths(req.body), { new: true })
			.select('-_id -products._id')
			.then((cart) => {
				if (cart) {
					res.json(cart);
				} else {
					res.status(404).json({
						status: 'error',
						message: 'cart not found',
					});
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
					const cartObj = cart.toObject();
					delete cartObj._id;
					cartObj.products = cartObj.products.map(({ _id, ...p }) => p);
					res.json(cartObj);
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
		Cart.findOneAndDelete({ id: req.params.id })
			.select('-_id -products._id')
			.then((cart) => {
				if (cart) {
					res.json(cart);
				} else {
					res.status(404).json({
						status: 'error',
						message: 'cart not found',
					});
				}
			})
			.catch((err) => {
				res.status(500).json({ status: 'error', message: err.message });
			});
	}
};
