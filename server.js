const { connectToDatabase } = require('./util/db');
const app = require('./app');

const port = process.env.PORT || 6400;

connectToDatabase()
	.then(() => {
		app.listen(port, () => {
			console.log(`Server running at http://localhost:${port}`);
		});
	})
	.catch((err) => {
		console.error('Failed to connect to database on startup:', err);
	});

module.exports = app;
