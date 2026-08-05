const supertest = require('supertest')
const app = require('../../app')

// seed.js keeps exactly two users: johnd (admin) and kevinryan (customer).
// Don't mutate or delete either one in a spec - every suite logs in as them.
const ADMIN = { username: 'johnd', password: 'm38rmF$' }
const CUSTOMER = { username: 'kevinryan', password: 'kev02937@' }

const login = async (username, password) => {
    const response = await supertest(app).post('/auth/login').send({ username, password })
    if (response.status !== 200 || !response.body.token) {
        throw new Error(`login failed for ${username}: ${response.status} ${JSON.stringify(response.body)}`)
    }
    return response.body.token
}

// A disposable customer with their own cart. Use this instead of kevinryan
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
