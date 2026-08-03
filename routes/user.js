const express = require('express')
const router = express.Router()
const user = require('../controller/user')
const { authenticate } = require('../util/auth')

router.get('/',user.getAllUser)
router.get('/:id',user.getUser)
router.post('/',user.addUser)
router.put('/:id',authenticate,user.editUser)
router.patch('/:id',authenticate,user.editUser)
router.delete('/:id',authenticate,user.deleteUser)

module.exports = router
