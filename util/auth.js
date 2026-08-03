const jwt = require('jsonwebtoken');

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

	try {
		const payload = jwt.verify(token, secret());
		req.user = {
			id: payload.id,
			username: payload.user,
			role: payload.role || 'customer',
		};
		next();
	} catch (err) {
		return unauthorized(res, 'token is invalid or expired');
	}
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

module.exports.isOwnerOrAdmin = (req, userId) =>
	!!req.user && (req.user.role === 'admin' || Number(req.user.id) === Number(userId));

module.exports.forbidden = (res, message) =>
	res.status(403).json({
		status: 'error',
		message: message || 'you are not allowed to access this resource',
	});
