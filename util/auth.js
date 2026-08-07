const jwt = require('jsonwebtoken');
const User = require('../model/user');

// Read lazily: server.js requires ./app (and therefore this module) before it
// calls dotenv.config(), so reading process.env at load time would miss it.
const secret = () => process.env.JWT_SECRET || 'secret_key';

const unauthorized = (res, message) =>
	res.status(401).json({
		status: 'error',
		message,
	});

module.exports.secret = secret;

module.exports.authenticate = (req, res, next) => {
	const header = req.get('Authorization') || '';
	const [scheme, token] = header.split(' ');

	if (!token || scheme.toLowerCase() !== 'bearer') {
		return unauthorized(res, 'a bearer token should be provided');
	}

	let payload;
	try {
		payload = jwt.verify(token, secret());
	} catch (err) {
		return unauthorized(res, 'token is invalid or expired');
	}

	// Nothing here sets an expiry, so a signed token would otherwise outlive the
	// account forever. Re-read the user on every request: deactivating or deleting
	// an account has to take effect immediately, and role changes shouldn't wait
	// for a fresh login either.
	User.findOne({ id: payload.id })
		.select('id username role active')
		.then((user) => {
			if (!user) {
				return unauthorized(res, 'the account for this token no longer exists');
			}
			if (user.active === false) {
				return res.status(403).json({
					status: 'error',
					message: 'this account has been deactivated',
				});
			}
			req.user = {
				id: user.id,
				username: user.username,
				role: user.role || 'customer',
			};
			next();
		})
		.catch((err) => res.status(500).json({ status: 'error', message: err.message }));
};

module.exports.requireAdmin = (req, res, next) => {
	if (!req.user || req.user.role !== 'admin') {
		return res.status(403).json({
			status: 'error',
			message: 'admin privileges are required',
		});
	}
	next();
};

// carts belong to shoppers; an admin manages the catalog, not a basket
module.exports.requireCustomer = (req, res, next) => {
	if (!req.user || req.user.role !== 'customer') {
		return res.status(403).json({
			status: 'error',
			message: 'carts are customer-only',
		});
	}
	next();
};

module.exports.isOwnerOrAdmin = (req, userId) =>
	!!req.user && (req.user.role === 'admin' || Number(req.user.id) === Number(userId));

module.exports.forbidden = (res, message) =>
	res.status(403).json({
		status: 'error',
		message: message || 'you are not allowed to access this resource',
	});
