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

// Seeding is offline: the data comes from the committed fixture, not the live
// fakestoreapi. Refresh it with `npm run seed:fetch` (scripts/fetch-seed-data.js),
// which is the only thing in the repo that hits the network.
const seedData = require('./data/seed-data.json');

// exactly two users (one admin, one customer) and one cart, owned by the customer
const ADMIN_USERNAME = 'admin';
const CUSTOMER_USERNAME = 'customer';

async function seedDatabase() {
	// every spec logs in as these two, so an empty or half-written fixture should
	// fail here rather than as a wall of confusing 401s
	if (!seedData.products.length || !seedData.users.length) {
		throw new Error('data/seed-data.json has no products or no users; run `npm run seed:fetch`');
	}

	mongoose.set('useFindAndModify', false);
	mongoose.set('useUnifiedTopology', true);
	await mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true });

	console.log('clearing collections...');
	await Promise.all([Product.deleteMany({}), Cart.deleteMany({}), User.deleteMany({})]);

	// Build indexes against the now-empty collections. The unique index on user.id
	// cannot be created over a collection that already holds a duplicate, and a DB
	// seeded before that index existed may well hold one - clearing first is what
	// makes this recoverable rather than a permanent error on every connect.
	await Promise.all([Product.syncIndexes(), Cart.syncIndexes(), User.syncIndexes()]);

	console.log('seeding products...');
	await Product.insertMany(seedData.products);

	console.log('seeding users...');
	await User.insertMany(seedData.users);

	console.log('seeding carts...');
	await Cart.insertMany(seedData.carts);

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
