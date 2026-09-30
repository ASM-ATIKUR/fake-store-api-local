const app = require('../app');
const { connectToDatabase } = require('../util/db');

module.exports = async (req, res) => {
	try {
		await connectToDatabase();
		return app(req, res);
	} catch (err) {
		console.error('Database connection error in Vercel function:', err);
		res.statusCode = 500;
		res.setHeader('Content-Type', 'application/json');
		return res.end(
			JSON.stringify({
				status: 'error',
				message: 'Database connection failed',
				error: err.message,
			})
		);
	}
};
