const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const fs = require('fs');
const Product = require('./model/product');
const Cart = require('./model/cart');
const User = require('./model/user');

if (fs.existsSync('.env.local')) {
	dotenvExpand.expand(dotenv.config({ path: '.env.local' }));
}
const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

const API = 'https://fakestoreapi.com';

// only two users are seeded: one admin and one customer.
const ADMIN_USERNAME = 'johnd';
const CUSTOMER_USERNAME = 'kevinryan';

async function fetchJson(path) {
	const res = await fetch(`${API}${path}`);
	if (!res.ok) {
		throw new Error(`GET ${path} failed with status ${res.status}`);
	}
	return res.json();
}

async function seedDatabase() {
	mongoose.set('useFindAndModify', false);
	mongoose.set('useUnifiedTopology', true);
	await mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true });

	console.log('clearing collections...');
	await Promise.all([Product.deleteMany({}), Cart.deleteMany({}), User.deleteMany({})]);

	console.log('fetching products...');
	await Product.insertMany(await fetchJson('/products'));

	console.log('fetching carts...');
	await Cart.insertMany(await fetchJson('/carts'));

	console.log('fetching users...');
	const allUsers = await fetchJson('/users');
	const admin = allUsers.find((user) => user.username === ADMIN_USERNAME);
	const customer = allUsers.find((user) => user.username === CUSTOMER_USERNAME);
	if (!admin || !customer) {
		throw new Error(
			`upstream is missing ${ADMIN_USERNAME} and/or ${CUSTOMER_USERNAME}; cannot seed users`
		);
	}

	// upstream data carries no roles, so mint an admin for the protected routes
	await User.insertMany([
		{ ...admin, role: 'admin' },
		{ ...customer, role: 'customer' },
	]);

	const counts = {
		products: await Product.countDocuments(),
		carts: await Cart.countDocuments(),
		users: await User.countDocuments(),
	};

	await mongoose.disconnect();
	return counts;
}

if (require.main === module) {
	seedDatabase()
		.then((counts) => {
			console.log(
				`done. products=${counts.products} carts=${counts.carts} users=${counts.users} (${ADMIN_USERNAME} is admin, ${CUSTOMER_USERNAME} is customer)`
			);
			process.exit(0);
		})
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
}

module.exports = { seedDatabase };
