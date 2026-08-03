const express = require('express')
const router = express.Router()
const cart = require('../controller/cart')
const { authenticate } = require('../util/auth')

// every cart route is private: carts are per-user data
router.use(authenticate)

router.get('/',cart.getAllCarts)
router.get('/:id',cart.getSingleCart)
router.get('/user/:userid',cart.getCartsbyUserid)

router.post('/',cart.addCart)
//router.post('/:id',cart.addtoCart)

router.put('/:id',cart.editCart)
router.patch('/:id',cart.editCart)
router.delete('/:id/products/:productId',cart.deleteCartProduct)
router.delete('/:id',cart.deleteCart)

module.exports = router
