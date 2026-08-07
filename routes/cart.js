const express = require('express')
const router = express.Router()
const cart = require('../controller/cart')
const { authenticate, requireCustomer } = require('../util/auth')

// every cart route is private: carts are per-user data, and they belong to
// shoppers only — an admin gets 403 on reads as well as writes
router.use(authenticate, requireCustomer)

router.get('/',cart.getAllCarts)
router.get('/:id',cart.getSingleCart)
router.get('/user/:userid',cart.getCartsbyUserid)

// writes always act on the caller's own cart, so no cart id in the path.
// register the two-segment /products routes before the bare /:id ones.
router.post('/',cart.addProductToCart)

router.put('/products/:productId',cart.editProductInCart)
router.patch('/products/:productId',cart.editProductInCart)
router.delete('/products/:productId',cart.deleteCartProduct)
router.delete('/:id',cart.deleteCart)

module.exports = router
