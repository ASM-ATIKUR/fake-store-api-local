const User = require('../model/user');
const nextId = require('../util/id');
const toDotPaths = require('../util/flatten');

module.exports.getAllUser = (req, res) => {
	const limit = Number(req.query.limit) || 0;
	const sort = req.query.sort == 'desc' ? -1 : 1;

	User.find()
		.select(['-_id'])
		.limit(limit)
		.sort({
			id: sort,
		})
		.then((users) => {
			res.json(users);
		})
		.catch((err) => console.log(err));
};

module.exports.getUser = (req, res) => {
	const id = req.params.id;

	User.findOne({
		id,
	})
		.select(['-_id'])
		.then((user) => {
			res.json(user);
		})
		.catch((err) => console.log(err));
};

module.exports.addUser = (req, res) => {
	if (!req.body || !req.body.email || !req.body.username || !req.body.password) {
		res.json({
			status: 'error',
			message: 'data is undefined',
		});
	} else {
		const name = req.body.name || {};
		const address = req.body.address || {};
		nextId(User)
			.then((id) =>
				new User({
					id,
					email: req.body.email,
					username: req.body.username,
					password: req.body.password,
					name: {
						firstname: name.firstname,
						lastname: name.lastname,
					},
					address: {
						city: address.city,
						street: address.street,
						number: address.number,
						zipcode: address.zipcode,
						geolocation: {
							lat: (address.geolocation || {}).lat,
							long: (address.geolocation || {}).long,
						},
					},
					phone: req.body.phone,
				}).save()
			)
			.then((user) => {
				const { _id, ...rest } = user.toObject();
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

module.exports.editUser = (req, res) => {
	if (!req.body || req.params.id == null) {
		res.json({
			status: 'error',
			message: 'something went wrong! check your sent data',
		});
	} else {
		delete req.body.id;
		User.findOneAndUpdate({ id: req.params.id }, toDotPaths(req.body), { new: true })
			.select('-_id')
			.then((user) => {
				if (user) {
					res.json(user);
				} else {
					res.status(404).json({
						status: 'error',
						message: 'user not found',
					});
				}
			})
			.catch((err) => {
				res.status(500).json({ status: 'error', message: err.message });
			});
	}
};

module.exports.deleteUser = (req, res) => {
	if (req.params.id == null) {
		res.json({
			status: 'error',
			message: 'cart id should be provided',
		});
	} else {
		User.findOneAndDelete({ id: req.params.id })
			.select('-_id')
			.then((user) => {
				if (user) {
					res.json(user);
				} else {
					res.status(404).json({
						status: 'error',
						message: 'user not found',
					});
				}
			})
			.catch((err) => {
				res.status(500).json({ status: 'error', message: err.message });
			});
	}
};
