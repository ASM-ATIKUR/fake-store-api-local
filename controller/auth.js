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
				if (!user) {
					return res.status(401).json({
						status: 'error',
						message: 'username or password is incorrect',
					});
				}
				if (user.active === false) {
					return res.status(403).json({
						status: 'error',
						message: 'this account has been deactivated',
					});
				}
				const role = user.role || 'customer';
				// role travels alongside the token so the UI can light up admin
				// features without decoding the JWT itself. It is never trusted
				// server-side: every check re-reads the user (see util/auth.js).
				res.json({
					token: jwt.sign({ id: user.id, user: user.username, role }, secret()),
					id: user.id,
					username: user.username,
					role,
				});
			})
			.catch((err) => {
				res.status(500).json({ status: 'error', message: err.message });
			});
	}
};
