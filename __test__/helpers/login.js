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

module.exports = {
    ADMIN,
    CUSTOMER,
    login,
    loginAdmin: () => login(ADMIN.username, ADMIN.password),
    loginCustomer: () => login(CUSTOMER.username, CUSTOMER.password),
}
