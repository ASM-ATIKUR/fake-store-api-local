const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

const productRoute = require('./routes/product');
const homeRoute = require('./routes/home');
const cartRoute = require('./routes/cart');
const userRoute = require('./routes/user');
const authRoute = require('./routes/auth');

app.use(cors());

app.use(express.static(path.join(__dirname, '/public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', 'views');

app.disable('view cache');

app.use('/', homeRoute);
app.use('/products', productRoute);
app.use('/carts', cartRoute);
app.use('/users', userRoute);
app.use('/auth', authRoute);

module.exports = app;
