const supertest = require('supertest')
const app = require('../app')
const { CUSTOMER, loginAdmin, loginCustomer, createThrowawayUser } = require('./helpers/login')

const product = {
    title: 'test',
    price: 13.5,
    description: 'test desc',
    image: 'test img',
    category: 'test cat'
}

describe('authentication and authorization', () => {
    let adminToken
    let customerToken
    let customerId

    beforeAll(async () => {
        adminToken = await loginAdmin()
        customerToken = await loginCustomer()

        const users = await supertest(app).get('/users')
        customerId = users.body.find((u) => u.username === CUSTOMER.username).id
    }, 30000)

    describe('authentication', () => {
        it('rejects a protected write with no token', async () => {
            const response = await supertest(app).post('/products').send(product)
            expect(response.status).toBe(401)
        })

        it('rejects a garbage token', async () => {
            const response = await supertest(app)
                .post('/products')
                .set('Authorization', 'Bearer not-a-real-token')
                .send(product)
            expect(response.status).toBe(401)
        })

        it('rejects a token sent without the Bearer scheme', async () => {
            const response = await supertest(app)
                .post('/products')
                .set('Authorization', adminToken)
                .send(product)
            expect(response.status).toBe(401)
        })

        it('rejects reading carts with no token', async () => {
            const response = await supertest(app).get('/carts')
            expect(response.status).toBe(401)
        })

        it('leaves product reads public', async () => {
            const response = await supertest(app).get('/products')
            expect(response.status).toBe(200)
        })

        it('leaves signup public', async () => {
            const response = await supertest(app).post('/users').send({
                email: 'public-signup@example.com',
                username: 'public_signup',
                password: 'pw12345',
                name: { firstname: 'public', lastname: 'signup' }
            })
            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('id')
            // a self-registered account must never come out as admin
            expect(response.body.role).toBe('customer')
        })
    })

    describe('admin-only product writes', () => {
        it('forbids a customer from adding a product', async () => {
            const response = await supertest(app)
                .post('/products')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(product)
            expect(response.status).toBe(403)
        })

        it('forbids a customer from deleting a product', async () => {
            const response = await supertest(app)
                .delete('/products/2')
                .set('Authorization', `Bearer ${customerToken}`)
            expect(response.status).toBe(403)
        })

        it('allows an admin to add a product', async () => {
            const response = await supertest(app)
                .post('/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(product)
            expect(response.status).toBe(200)
            expect(response.body).toHaveProperty('id')
        })
    })

    describe('cart ownership', () => {
        it("forbids reading another user's carts by user id", async () => {
            const response = await supertest(app)
                .get('/carts/user/1')
                .set('Authorization', `Bearer ${customerToken}`)
            expect(response.status).toBe(403)
        })

        it('allows reading your own carts by user id', async () => {
            const response = await supertest(app)
                .get(`/carts/user/${customerId}`)
                .set('Authorization', `Bearer ${customerToken}`)
            expect(response.status).toBe(200)
        })

        it('scopes GET /carts to the calling customer', async () => {
            const response = await supertest(app)
                .get('/carts')
                .set('Authorization', `Bearer ${customerToken}`)
            expect(response.status).toBe(200)
            response.body.forEach((cart) => {
                expect(cart.userId).toBe(customerId)
            })
        })

        it('lets an admin see carts belonging to other users', async () => {
            const response = await supertest(app)
                .get('/carts')
                .set('Authorization', `Bearer ${adminToken}`)
            expect(response.status).toBe(200)
            expect(response.body.some((cart) => cart.userId !== 1)).toBe(true)
        })

        it('ignores a userId in the body and adds to the caller own cart', async () => {
            const products = await supertest(app).get('/products?limit=1')
            const product = products.body[0]

            // a throwaway shopper: cart.spec.js mutates carts in parallel, and two
            // files pushing to one cart document race
            const shopper = await createThrowawayUser()
            const response = await supertest(app)
                .post('/carts')
                .set('Authorization', `Bearer ${shopper.token}`)
                .send({ userId: 1, productId: product.id, quantity: 1 })
            expect(response.status).toBe(200)
            expect(response.body.userId).toBe(shopper.id)
        })

        it("forbids deleting another user's cart, and leaves it intact", async () => {
            // seeded cart 1 belongs to johnd (userId 1). No spec mutates it: cart
            // writes are customer-only and every customer spec uses its own user.
            const target = await supertest(app)
                .get('/carts/1')
                .set('Authorization', `Bearer ${adminToken}`)
            expect(target.status).toBe(200)

            const response = await supertest(app)
                .delete('/carts/1')
                .set('Authorization', `Bearer ${customerToken}`)
            expect(response.status).toBe(403)

            const stillThere = await supertest(app)
                .get('/carts/1')
                .set('Authorization', `Bearer ${adminToken}`)
            expect(stillThere.status).toBe(200)
        })

        it('forbids an admin from writing to carts', async () => {
            const response = await supertest(app)
                .post('/carts')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ productId: 1, quantity: 1 })
            expect(response.status).toBe(403)
        })
    })

    describe('user account ownership', () => {
        it("forbids editing another user's account", async () => {
            const response = await supertest(app)
                .patch('/users/1')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ email: 'hijacked@example.com' })
            expect(response.status).toBe(403)
        })

        it('allows editing your own account', async () => {
            const response = await supertest(app)
                .patch(`/users/${customerId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ phone: '555-0100' })
            expect(response.status).toBe(200)
            expect(response.body.phone).toBe('555-0100')
        })

        it('ignores a self-promotion attempt', async () => {
            const response = await supertest(app)
                .patch(`/users/${customerId}`)
                .set('Authorization', `Bearer ${customerToken}`)
                .send({ role: 'admin' })
            expect(response.status).toBe(200)
            expect(response.body.role).toBe('customer')
        })

        it('requires a token to delete an account', async () => {
            const response = await supertest(app).delete(`/users/${customerId}`)
            expect(response.status).toBe(401)
        })
    })
})
