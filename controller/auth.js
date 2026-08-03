const User = require('../model/user');
const jwt = require('jsonwebtoken');
const { secret } = require('../util/auth');

module.exports.login = (req, res) => {
	const { username, password } = req.body || {};
	if (!username || !password) {
		res.status(400).json({
			status: 'error',
			message: 'username and password should be provided',
		});
	} else {
		User.findOne({
			username: username,
			password: password,
		})
			.then((user) => {
				if (user) {
					res.json({
						token: jwt.sign(
							{
								id: user.id,
								user: user.username,
								role: user.role || 'customer',
							},
							secret()
						),
					});
				} else {
					res.status(401).json({
						status: 'error',
						message: 'username or password is incorrect',
					});
				}
			})
			.catch((err) => {
				res.status(500).json({ status: 'error', message: err.message });
			});
	}
};
