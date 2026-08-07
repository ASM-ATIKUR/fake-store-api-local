const supertest = require('supertest')
const app = require('../../app')

// seed.js keeps exactly two users: admin (id 1) and customer (id 3), both with
// the password '123'. These must match SEED_USERS in scripts/fetch-seed-data.js.
// Don't mutate or delete either one in a spec - every suite logs in as them.
const ADMIN = { username: 'admin', password: '123' }
const CUSTOMER = { username: 'customer', password: '123' }

const login = async (username, password) => {
    const response = await supertest(app).post('/auth/login').send({ username, password })
    if (response.status !== 200 || !response.body.token) {
        throw new Error(`login failed for ${username}: ${response.status} ${JSON.stringify(response.body)}`)
    }
    return response.body.token
}

// A disposable customer with their own cart. Use this instead of the seeded customer
// whenever a spec MUTATES a cart: jest runs spec files in parallel, and two
// files pushing to the same cart document race on mongoose's $push.
let scratchCount = 0
const createThrowawayUser = async () => {
    const username = `throwaway_${Date.now()}_${scratchCount++}`
    const password = 'pw123456'
    const created = await supertest(app).post('/users').send({
        email: `${username}@test.com`,
        username,
        password,
        name: { firstname: 'through', lastname: 'away' },
    })
    if (created.status !== 200 || !created.body.id) {
        throw new Error(`signup failed: ${created.status} ${JSON.stringify(created.body)}`)
    }
    return { id: created.body.id, username, password, token: await login(username, password) }
}

module.exports = {
    ADMIN,
    CUSTOMER,
    login,
    loginAdmin: () => login(ADMIN.username, ADMIN.password),
    loginCustomer: () => login(CUSTOMER.username, CUSTOMER.password),
    createThrowawayUser,
}
