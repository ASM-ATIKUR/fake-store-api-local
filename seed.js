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

async function fetchJson(path) {
	const res = await fetch(`${API}${path}`);
	if (!res.ok) {
		throw new Error(`GET ${path} failed with status ${res.status}`);
	}
	return res.json();
}

async function seed() {
	await mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true });

	console.log('clearing collections...');
	await Promise.all([Product.deleteMany({}), Cart.deleteMany({}), User.deleteMany({})]);

	console.log('fetching products...');
	await Product.insertMany(await fetchJson('/products'));

	console.log('fetching carts...');
	await Cart.insertMany(await fetchJson('/carts'));

	console.log('fetching users...');
	await User.insertMany(await fetchJson('/users'));

	const [products, carts, users] = await Promise.all([
		Product.countDocuments(),
		Cart.countDocuments(),
		User.countDocuments(),
	]);
	console.log(`done. products=${products} carts=${carts} users=${users}`);

	await mongoose.disconnect();
}

seed()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
