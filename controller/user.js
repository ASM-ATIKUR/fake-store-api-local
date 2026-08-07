const User = require('../model/user');
const nextId = require('../util/id');
const toDotPaths = require('../util/flatten');
const { isOwnerOrAdmin, forbidden } = require('../util/auth');

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

	if (!isOwnerOrAdmin(req, id)) {
		return forbidden(res, 'you can only view your own account');
	}

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
	} else if (!isOwnerOrAdmin(req, req.params.id)) {
		forbidden(res, 'you can only modify your own account');
	} else {
		delete req.body.id;
		// only an admin may change role or active, otherwise anyone could promote
		// themselves or undo their own deactivation
		if (req.user.role !== 'admin') {
			delete req.body.role;
			delete req.body.active;
		}
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

// PATCH /users/:id/active — admin-only, body {active: true|false}
module.exports.setUserActive = (req, res) => {
	const active = (req.body || {}).active;

	if (typeof active !== 'boolean') {
		return res.status(400).json({
			status: 'error',
			message: 'active should be provided as true or false',
		});
	}
	// authenticate rejects a deactivated token on the very next request, so an
	// admin switching themselves off would be locked out with no way back in
	if (active === false && Number(req.user.id) === Number(req.params.id)) {
		return res.status(400).json({
			status: 'error',
			message: 'you cannot deactivate your own account',
		});
	}

	User.findOneAndUpdate({ id: req.params.id }, { $set: { active } }, { new: true })
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
};

module.exports.deleteUser = (req, res) => {
	if (req.params.id == null) {
		res.json({
			status: 'error',
			message: 'user id should be provided',
		});
	} else if (!isOwnerOrAdmin(req, req.params.id)) {
		forbidden(res, 'you can only delete your own account');
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
