const Product = require('../model/product');
const nextId = require('../util/id');
const toDotPaths = require('../util/flatten');

module.exports.getAllProducts = (req, res) => {
	const limit = Number(req.query.limit) || 0;
	const sort = req.query.sort == 'desc' ? -1 : 1;

	Product.find()
		.select(['-_id'])
		.limit(limit)
		.sort({ id: sort })
		.then((products) => {
			res.json(products);
		})
		.catch((err) => console.log(err));
};

module.exports.getProduct = (req, res) => {
	const id = req.params.id;

	Product.findOne({
		id,
	})
		.select(['-_id'])
		.then((product) => {
			res.json(product);
		})
		.catch((err) => console.log(err));
};

module.exports.getProductCategories = (req, res) => {
	Product.distinct('category')
		.then((categories) => {
			res.json(categories);
		})
		.catch((err) => console.log(err));
};

module.exports.getProductsInCategory = (req, res) => {
	const category = req.params.category;
	const limit = Number(req.query.limit) || 0;
	const sort = req.query.sort == 'desc' ? -1 : 1;

	Product.find({
		category,
	})
		.select(['-_id'])
		.limit(limit)
		.sort({ id: sort })
		.then((products) => {
			res.json(products);
		})
		.catch((err) => console.log(err));
};

module.exports.addProduct = (req, res) => {
	if (!req.body || !req.body.title || !req.body.price) {
		res.json({
			status: 'error',
			message: 'data is undefined',
		});
	} else {
		nextId(Product)
			.then((id) =>
				new Product({
					id,
					title: req.body.title,
					price: req.body.price,
					description: req.body.description,
					image: req.body.image,
					category: req.body.category,
				}).save()
			)
			.then((product) => {
				const { _id, ...rest } = product.toObject();
				res.json(rest);
			})
			.catch((err) =>
				res.status(err.name === 'ValidationError' ? 400 : 500).json({
					status: 'error',
					message: err.message,
				})
			);
	}
};

module.exports.editProduct = (req, res) => {
	if (!req.body || req.params.id == null) {
		res.json({
			status: 'error',
			message: 'something went wrong! check your sent data',
		});
	} else {
		delete req.body.id;
		Product.findOneAndUpdate({ id: req.params.id }, toDotPaths(req.body), { new: true })
			.select('-_id')
			.then((product) => {
				if (product) {
					res.json(product);
				} else {
					res.status(404).json({
						status: 'error',
						message: 'product not found',
					});
				}
			})
			.catch((err) => {
				res.status(500).json({ status: 'error', message: err.message });
			});
	}
};

module.exports.deleteProduct = (req, res) => {
	if (req.params.id == null) {
		res.json({
			status: 'error',
			message: 'cart id should be provided',
		});
	} else {
		Product.findOneAndDelete({ id: req.params.id })
			.select('-_id')
			.then((product) => {
				if (product) {
					res.json(product);
				} else {
					res.status(404).json({
						status: 'error',
						message: 'product not found',
					});
				}
			})
			.catch((err) => {
				res.status(500).json({ status: 'error', message: err.message });
			});
	}
};
