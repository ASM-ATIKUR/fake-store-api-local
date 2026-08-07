const supertest = require("supertest")
const app = require("../app")
const { loginAdmin } = require("./helpers/login")

describe("Testing products API", () => {
    let adminToken

    beforeAll(async () => {
        adminToken = await loginAdmin()
    }, 30000)

    it("all product", async () => {
        const response = await supertest(app).get("/products")
        expect(response.status).toBe(200)
        console.log('get', response.body)
        expect(response.body).not.toStrictEqual([])
    })

    it("get a single product", async () => {
        const response = await supertest(app).get("/products/1")
        expect(response.status).toBe(200)
        console.log('get by id', response.body)
        expect(response.body).not.toStrictEqual({})
        expect(response.body).toHaveProperty('title')
    })


    it("get products in a category", async () => {
        const response = await supertest(app).get("/products/category/jewelery")
        expect(response.status).toBe(200)
        console.log('get by category', response.body)
        expect(response.body).not.toStrictEqual([])
    })


    it("get products in a limit and sort", async () => {
        const response = await supertest(app).get("/products?limit=3&sort=desc")
        expect(response.status).toBe(200)
        console.log('get with querystring', response.body)
        expect(response.body).not.toStrictEqual([])
        expect(response.body).toHaveLength(3);
    })

    describe('sorting', () => {
        // this suite edits and deletes products, and others run in parallel, so
        // assert on the ordering of whatever came back rather than on fixed ids
        const isSorted = (values, direction, compare) =>
            values.every((value, i) =>
                i === 0 || (direction === 'desc'
                    ? compare(values[i - 1], value) >= 0
                    : compare(values[i - 1], value) <= 0))

        const byNumber = (a, b) => a - b
        const byName = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase())

        it('sorts all products by price', async () => {
            const asc = await supertest(app).get('/products?sortby=price')
            expect(asc.status).toBe(200)
            expect(asc.body).not.toStrictEqual([])
            expect(isSorted(asc.body.map(p => p.price), 'asc', byNumber)).toBe(true)

            const desc = await supertest(app).get('/products?sortby=price&sort=desc')
            expect(isSorted(desc.body.map(p => p.price), 'desc', byNumber)).toBe(true)
        })

        it('sorts all products by name, ignoring case', async () => {
            const asc = await supertest(app).get('/products?sortby=name')
            expect(asc.status).toBe(200)
            expect(asc.body).not.toStrictEqual([])
            expect(isSorted(asc.body.map(p => p.title), 'asc', byName)).toBe(true)

            const desc = await supertest(app).get('/products?sortby=name&sort=desc')
            expect(isSorted(desc.body.map(p => p.title), 'desc', byName)).toBe(true)
        })

        it('sorts a category by price and by name', async () => {
            const byPrice = await supertest(app).get('/products/category/jewelery?sortby=price&sort=desc')
            expect(byPrice.status).toBe(200)
            expect(byPrice.body).not.toStrictEqual([])
            expect(isSorted(byPrice.body.map(p => p.price), 'desc', byNumber)).toBe(true)

            const byTitle = await supertest(app).get('/products/category/jewelery?sortby=name')
            expect(isSorted(byTitle.body.map(p => p.title), 'asc', byName)).toBe(true)
        })

        it('sorts by price within the limit, not just the first N by id', async () => {
            const all = await supertest(app).get('/products?sortby=price')
            const limited = await supertest(app).get('/products?sortby=price&limit=3')
            expect(limited.body).toHaveLength(3)
            expect(isSorted(limited.body.map(p => p.price), 'asc', byNumber)).toBe(true)

            // the three must come off the cheap end of the catalog. Compared
            // against the median rather than all.body[2] because another worker
            // can insert a product between these two requests.
            const median = all.body[Math.floor(all.body.length / 2)].price
            expect(limited.body[2].price).toBeLessThanOrEqual(median)
        })

        it('falls back to id when sortby is missing or unknown', async () => {
            const none = await supertest(app).get('/products')
            expect(isSorted(none.body.map(p => p.id), 'asc', byNumber)).toBe(true)

            const bogus = await supertest(app).get('/products?sortby=nonsense')
            expect(bogus.status).toBe(200)
            expect(isSorted(bogus.body.map(p => p.id), 'asc', byNumber)).toBe(true)
        })
    })

    it("post a product", async () => {
        const response = await supertest(app).post('/products').set('Authorization', `Bearer ${adminToken}`).send({
            title: 'test',
            price: 13.5,
            description: 'test desc',
            image: 'test img',
            category: 'text cat'
        })
        expect(response.status).toBe(200)
        console.log('post', response.body)
        expect(response.body).toHaveProperty('id')
    })

    it("put a product", async () => {
        const response = await supertest(app).put('/products/1').set('Authorization', `Bearer ${adminToken}`).send({
            title: 'test',
            price: 13.5,
            description: 'test desc',
            image: 'test img',
            category: 'text cat'
        })
        expect(response.status).toBe(200)
        console.log('put', response.body)
        expect(response.body).toHaveProperty('id')
    })


    it("patch a product", async () => {
        const response = await supertest(app).patch('/products/1').set('Authorization', `Bearer ${adminToken}`).send({
            title: 'test',
            price: 13.5,
            description: 'test desc',
            image: 'test img',
            category: 'text cat'
        })
        expect(response.status).toBe(200)
        console.log('patch', response.body)
        expect(response.body).toHaveProperty('id')
    })


    it('delete a product', async () => {
        const response = await supertest(app).delete('/products/1').set('Authorization', `Bearer ${adminToken}`)
        expect(response.status).toBe(200)
        console.log('delete', response.body)
        expect(response.body).toHaveProperty('id')
    })

})
