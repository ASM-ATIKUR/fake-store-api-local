const express = require('express')
const router = express.Router()
const user = require('../controller/user')
const { authenticate, requireAdmin } = require('../util/auth')

// listing every account is admin-only; a single account is owner-or-admin,
// checked in the controller since it needs the record first.
router.get('/',authenticate,requireAdmin,user.getAllUser)
router.get('/:id',authenticate,user.getUser)

// signup stays public - that is the only way an account is ever created
router.post('/',user.addUser)

// activation is an admin lever, so it gets its own route rather than riding
// along on the edit body where an owner could reach it
router.patch('/:id/active',authenticate,requireAdmin,user.setUserActive)

router.put('/:id',authenticate,user.editUser)
router.patch('/:id',authenticate,user.editUser)
router.delete('/:id',authenticate,user.deleteUser)

module.exports = router
