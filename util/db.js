const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const fs = require('fs');
const path = require('path');

// Ensure env variables are loaded if not already present
if (!process.env.DATABASE_URL) {
	const rootDir = path.join(__dirname, '..');
	const envLocal = path.join(rootDir, '.env.local');
	const envDefault = path.join(rootDir, '.env');

	if (fs.existsSync(envLocal)) {
		dotenvExpand.expand(dotenv.config({ path: envLocal }));
	}
	if (fs.existsSync(envDefault)) {
		dotenvExpand.expand(dotenv.config({ path: envDefault }));
	}
}

let cached = global.mongoose;

if (!cached) {
	cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
	if (cached.conn && mongoose.connection.readyState === 1) {
		return cached.conn;
	}

	if (!cached.promise) {
		const uri = process.env.DATABASE_URL;
		if (!uri) {
			throw new Error('DATABASE_URL environment variable is not defined');
		}

		mongoose.set('useFindAndModify', false);
		mongoose.set('useUnifiedTopology', true);

		const opts = {
			useNewUrlParser: true,
			bufferCommands: false, // Fail immediately if not connected rather than hanging
			serverSelectionTimeoutMS: 15000, // 15s timeout for reliable connection over internet
			...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {}),
		};

		cached.promise = mongoose.connect(uri, opts).then((m) => {
			return m;
		});
	}

	try {
		cached.conn = await cached.promise;
	} catch (e) {
		cached.promise = null; // Allow retry on subsequent requests
		throw e;
	}

	return cached.conn;
}

module.exports = { connectToDatabase };
