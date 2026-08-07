const supertest = require('supertest')
const app = require('../app')
const { loginAdmin, createThrowawayUser } = require('./helpers/login')

// Carts are customer-only end to end now - an admin gets 403 on reads as well as
// writes - so every read here runs as the same throwaway customer that does the
// writes, against carts it owns. Never kevinryan, whose cart authorization.spec.js
// also touches: jest runs spec files in parallel and two writers race on $push.
// Ownership rules are covered in authorization.spec.js
describe('testing cart API',()=>{
    let token
    let customerToken
    let customerId
    const auth = (request) => request.set('Authorization', `Bearer ${token}`)
    const asCustomer = (request) => request.set('Authorization', `Bearer ${customerToken}`)

    beforeAll(async () => {
        token = await loginAdmin()
        const customer = await createThrowawayUser()
        customerToken = customer.token
        customerId = customer.id
        // GET /carts mints one if this user inherited none, so there is always
        // at least one cart of its own to read back
        await asCustomer(supertest(app).get('/carts'))
    }, 30000)

    // product.spec.js deletes products, so never hard-code an id here.
    // product reads are public, no token needed
    const anyProduct = async () => {
        const response = await supertest(app).get('/products?limit=1')
        return response.body[0]
    }

    // a cart the calling customer owns
    const myCart = async () => {
        const response = await asCustomer(supertest(app).get('/carts'))
        return response.body[0]
    }

    // every cart in the response belongs to the caller
    const allMine = (carts) => carts.every(cart => cart.userId === customerId)

    it('get all carts',async()=>{
        const response = await asCustomer(supertest(app).get('/carts'))
        expect(response.status).toBe(200)
        console.log(response.body)
        expect(response.body).not.toEqual([]);
        expect(allMine(response.body)).toBe(true);
    })


    it('get a single cart',async ()=>{
        const cart = await myCart()
        const response = await asCustomer(supertest(app).get(`/carts/${cart.id}`))
        expect(response.status).toBe(200);
        console.log(response.body)
        expect(response.body).not.toEqual({});
        expect(response.body).toHaveProperty('userId');
        expect(response.body).not.toHaveProperty('_id');
        // line items must not leak their subdocument ids either
        response.body.products.forEach(product => {
            expect(product).not.toHaveProperty('_id')
        })
    })

    // the throwaway user's own carts are stamped at signup time, so every date
    // window here has to reach the present rather than the seeded 2019-2020 range
    const RANGE = 'startdate=2019-12-10&enddate=2100-01-01'

    it("get carts in a date range and limit and sort", async () => {
        const response = await asCustomer(supertest(app).get(`/carts?limit=2&sort=desc&${RANGE}`))
        expect(response.status).toBe(200)
        console.log('get with querystring', response.body)
        expect(response.body).not.toEqual([])
        expect(response.body.length).toBeLessThanOrEqual(2)
        expect(allMine(response.body)).toBe(true)
    })




    it("get carts in for user in date range", async () => {
        const response = await asCustomer(supertest(app).get(`/carts/user/${customerId}?${RANGE}`))
        expect(response.status).toBe(200)
        console.log('get with date range', response.body)
        expect(response.body).not.toEqual([])
    })

    it("get carts in for user without start date", async () => {
        const response = await asCustomer(supertest(app).get(`/carts/user/${customerId}?enddate=2100-01-01`))
        expect(response.status).toBe(200)
        console.log('get user cart without start date', response.body)
        expect(response.body).not.toEqual([])
    })

    it("get carts in for user without end date", async () => {
        const response = await asCustomer(supertest(app).get(`/carts/user/${customerId}?startdate=2019-12-10`))
        expect(response.status).toBe(200)
        console.log('get user cart without end date', response.body)
        expect(response.body).not.toEqual([])
    })

    it("get carts in for user", async () => {
        const response = await asCustomer(supertest(app).get(`/carts/user/${customerId}`))
        expect(response.status).toBe(200)
        console.log('get with userid', response.body)
        expect(response.body).not.toEqual([])
    })


    // the line the caller just touched, read back off the response
    const lineFor = (response, productId) =>
        response.body.products.find(p => p.productId === productId)

    it('adds a product to the caller own cart',async () => {
        const product = await anyProduct()
        const response = await asCustomer(supertest(app).post('/carts')).send({
            productId:product.id,
            quantity:2
        })
        expect(response.status).toBe(200);
        console.log(response.body)
        expect(response.body).toHaveProperty('id');
        expect(lineFor(response, product.id).quantity).toBe(2);
    })

    it('stamps priceAtAdd from the catalog, ignoring whatever the client sent',async () => {
        const product = await anyProduct()
        const response = await asCustomer(supertest(app).post('/carts')).send({
            productId:product.id,
            quantity:1,
            priceAtAdd:0.01
        })
        expect(response.status).toBe(200);
        expect(lineFor(response, product.id).priceAtAdd).toBe(product.price);
    })

    it('bumps the quantity when the same product is added again',async () => {
        const product = await anyProduct()
        const before = await asCustomer(supertest(app).post('/carts')).send({
            productId:product.id,
            quantity:1
        })
        expect(before.status).toBe(200);

        const after = await asCustomer(supertest(app).post('/carts')).send({
            productId:product.id,
            quantity:3
        })
        expect(after.status).toBe(200);
        expect(lineFor(after, product.id).quantity).toBe(lineFor(before, product.id).quantity + 3);
        // still a single line for that product
        expect(after.body.products.filter(p => p.productId === product.id)).toHaveLength(1);
    })

    it('rejects a quantity below 1',async () => {
        const product = await anyProduct()
        const response = await asCustomer(supertest(app).post('/carts')).send({
            productId:product.id,
            quantity:-99
        })
        expect(response.status).toBe(400);
    })

    it('rejects a product that is not in the catalog',async () => {
        const response = await asCustomer(supertest(app).post('/carts')).send({
            productId:999999,
            quantity:1
        })
        expect(response.status).toBe(404);
    })

    it('rejects an add with no productId',async () => {
        const response = await asCustomer(supertest(app).post('/carts')).send({quantity:1})
        expect(response.status).toBe(400);
    })


    it('updates a product in the cart with PUT',async () => {
        const product = await anyProduct()
        await asCustomer(supertest(app).post('/carts')).send({productId:product.id,quantity:1})

        const response = await asCustomer(supertest(app).put(`/carts/products/${product.id}`)).send({
            quantity:4
        })
        expect(response.status).toBe(200);
        console.log(response.body)
        expect(lineFor(response, product.id).quantity).toBe(4);
    })


    it('updates a product in the cart with PATCH and leaves priceAtAdd alone',async () => {
        const product = await anyProduct()
        const added = await asCustomer(supertest(app).post('/carts')).send({productId:product.id,quantity:1})

        const response = await asCustomer(supertest(app).patch(`/carts/products/${product.id}`)).send({
            quantity:6,
            priceAtAdd:0.01
        })
        expect(response.status).toBe(200);
        expect(lineFor(response, product.id).quantity).toBe(6);
        expect(lineFor(response, product.id).priceAtAdd).toBe(lineFor(added, product.id).priceAtAdd);
    })

    it('rejects an update to a quantity below 1',async () => {
        const product = await anyProduct()
        await asCustomer(supertest(app).post('/carts')).send({productId:product.id,quantity:1})

        const response = await asCustomer(supertest(app).patch(`/carts/products/${product.id}`)).send({
            quantity:0
        })
        expect(response.status).toBe(400);
    })

    it('rejects an update to a product that is not in the cart',async () => {
        const response = await asCustomer(supertest(app).patch('/carts/products/999999')).send({
            quantity:2
        })
        expect(response.status).toBe(404);
    })


    it('delete a product from a cart',async () => {
        const product = await anyProduct()
        await asCustomer(supertest(app).post('/carts')).send({productId:product.id,quantity:1})

        const response = await asCustomer(supertest(app).delete(`/carts/products/${product.id}`))
        expect(response.status).toBe(200);
        console.log(response.body)
        expect(response.body).toHaveProperty('id');
        expect(response.body.products).not.toContainEqual(expect.objectContaining({productId:product.id}));
    })

    it('404s deleting a product the cart does not hold',async () => {
        const response = await asCustomer(supertest(app).delete('/carts/products/999999'))
        expect(response.status).toBe(404);
    })


    describe('admin is locked out of carts', () => {
        it('cannot list carts', async () => {
            const response = await auth(supertest(app).get('/carts'))
            expect(response.status).toBe(403)
            expect(response.body.message).toMatch(/customer-only/)
        })

        it('cannot read a single cart', async () => {
            const response = await auth(supertest(app).get('/carts/1'))
            expect(response.status).toBe(403)
        })

        it("cannot read a user's carts", async () => {
            const response = await auth(supertest(app).get('/carts/user/1'))
            expect(response.status).toBe(403)
        })

        it('cannot add a product', async () => {
            const product = await anyProduct()
            const response = await auth(supertest(app).post('/carts')).send({
                productId:product.id,
                quantity:1
            })
            expect(response.status).toBe(403)
        })

        it('cannot update a product', async () => {
            const response = await auth(supertest(app).put('/carts/products/1')).send({quantity:2})
            expect(response.status).toBe(403)
        })

        it('cannot delete a product', async () => {
            const response = await auth(supertest(app).delete('/carts/products/1'))
            expect(response.status).toBe(403)
        })

        it('cannot delete a cart', async () => {
            const response = await auth(supertest(app).delete('/carts/1'))
            expect(response.status).toBe(403)
        })
    })


    it('gives a customer with no carts an empty one', async () => {
        const fresh = await createThrowawayUser()
        const asFresh = (request) => request.set('Authorization', `Bearer ${fresh.token}`)

        // A new user id can collide with a seeded cart's userId - seed.js keeps only
        // users 1 and 3 but seeds carts for userIds 1,2,3,4,8. Clear whatever they
        // inherited so "has no cart" is actually true.
        const inherited = await asFresh(supertest(app).get('/carts'))
        for (const cart of inherited.body) {
            await asFresh(supertest(app).delete(`/carts/${cart.id}`))
        }

        const first = await asFresh(supertest(app).get('/carts'))
        expect(first.status).toBe(200)
        expect(first.body).toHaveLength(1)
        expect(first.body[0].products).toEqual([])
        expect(first.body[0].userId).toBe(fresh.id)

        // asking again must return the same cart, not mint another
        const second = await asFresh(supertest(app).get('/carts'))
        expect(second.body).toHaveLength(1)
        expect(second.body[0].id).toBe(first.body[0].id)

        // and a narrow date window must not mint one either
        await asFresh(supertest(app).get('/carts?startdate=2019-01-01&enddate=2019-06-01'))
        const third = await asFresh(supertest(app).get('/carts'))
        expect(third.body).toHaveLength(1)
        expect(third.body[0].id).toBe(first.body[0].id)
    })


    // last: this removes the customer's active cart
    it('delete a cart',async () => {
        const mine = await asCustomer(supertest(app).get('/carts'))
        const target = mine.body[mine.body.length - 1]

        const response = await asCustomer(supertest(app).delete(`/carts/${target.id}`))
        expect(response.status).toBe(200);
        console.log(response.body)
        expect(response.body).toHaveProperty('id');
    })

})
