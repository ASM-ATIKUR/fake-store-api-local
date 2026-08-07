const supertest = require('supertest')
const app = require('../app')
const { loginAdmin, login, createThrowawayUser } = require('./helpers/login')

// Reading users is admin-only now, so every read here carries the admin token.
describe('testing user API',()=>{
    let adminToken
    // seed.js only keeps the admin and the customer, so the write tests below
    // operate on the throwaway user created by 'add a new user'.
    let scratchUserId
    const auth = (request) => request.set('Authorization', `Bearer ${adminToken}`)

    beforeAll(async () => {
        adminToken = await loginAdmin()
    }, 30000)

    it('get all users',async()=>{
        const response = await auth(supertest(app).get('/users'))
        expect(response.status).toBe(200)
        console.log(response.body)
        expect(response.body).not.toStrictEqual([]);
    })


    it('get a single user',async ()=>{
        const response = await auth(supertest(app).get('/users/1'))
        expect(response.status).toBe(200);
        console.log(response.body)
        expect(response.body).not.toStrictEqual({});
        expect(response.body.name).toHaveProperty('firstname');
    },30000)

    it("get users in a limit and sort", async () => {
        const response = await auth(supertest(app).get("/users?limit=2&sort=desc"))
        expect(response.status).toBe(200)
        console.log('get with querystring', response.body)
        expect(response.body).not.toStrictEqual([])
        expect(response.body).toHaveLength(2);
    })

    it('refuses to list users without a token',async()=>{
        const response = await supertest(app).get('/users')
        expect(response.status).toBe(401)
    })


    // signup stays public - no Authorization header here on purpose
    it('add a new user',async () => {
        const response = await supertest(app).post('/users').send({
            email:'scratch@gmail.com',
            username:'scratchuser',
            password:'m38rmF$',
            name:{
                firstname:'John',
                lastname:'Doe'
            },
            address:{
                city:'kilcoole',
                street:'7835 new road',
                number:3,
                zipcode:'12926-3874',
                geolocation:{
                    lat:'-37.3159',
                    long:'81.1496'
                }
            },
            phone:'1-570-236-7033'
        })
        expect(response.status).toBe(200);
        console.log(response.body)
        expect(response.body).toHaveProperty('id');
        scratchUserId = response.body.id
    },30000)


    it('put a user',async () => {
        const response = await supertest(app).put(`/users/${scratchUserId}`).set('Authorization', `Bearer ${adminToken}`).send({
            email:'mrk@y.com',
            username:'mrk',
            password:'1234566',
            name:{
                firstname:'mohamamdreze',
                lastname:'kei'
            },
            avatar:'http://test.com',
            address:{
                city:'tehran',
                street:'blv',
                alley:'aval',
                number:3,
                geolocation:{
                    lat:'123.345354',
                    long:'54.23424'
                }
            },
            phone:'+989123456783'
        })
        expect(response.status).toBe(200);
        console.log(response.body)
        expect(response.body).toHaveProperty('id');
    })


    it('patch a user',async () => {
        const response = await supertest(app).patch(`/users/${scratchUserId}`).set('Authorization', `Bearer ${adminToken}`).send({
            email:'mrk@y.com',
            username:'mrk',
            password:'1234566',
            name:{
                firstname:'mohamamdreze',
                lastname:'kei'
            },
            avatar:'http://test.com',
            address:{
                city:'tehran',
                street:'blv',
                alley:'aval',
                number:3,
                geolocation:{
                    lat:'123.345354',
                    long:'54.23424'
                }
            },
            phone:'+989123456783'
        })
        expect(response.status).toBe(200);
        console.log(response.body)
        expect(response.body).toHaveProperty('id');
    })


    it('delete a user',async () => {
        const response = await supertest(app).delete(`/users/${scratchUserId}`).set('Authorization', `Bearer ${adminToken}`)
        expect(response.status).toBe(200);
        console.log(response.body)
        expect(response.body).toHaveProperty('id');
    })


    describe('activating and deactivating an account', () => {
        const setActive = (id, body) =>
            auth(supertest(app).patch(`/users/${id}/active`)).send(body)

        it('signs a new account up as active', async () => {
            const fresh = await createThrowawayUser()
            const response = await auth(supertest(app).get(`/users/${fresh.id}`))
            expect(response.status).toBe(200)
            expect(response.body.active).toBe(true)
        })

        it('locks a deactivated user out of both their token and a fresh login', async () => {
            const target = await createThrowawayUser()

            const off = await setActive(target.id, { active: false })
            expect(off.status).toBe(200)
            expect(off.body.active).toBe(false)

            // the token was issued while the account was still live: it has no
            // expiry, so only the per-request re-read can stop it
            const withOldToken = await supertest(app)
                .get(`/users/${target.id}`)
                .set('Authorization', `Bearer ${target.token}`)
            expect(withOldToken.status).toBe(403)

            const relogin = await supertest(app)
                .post('/auth/login')
                .send({ username: target.username, password: target.password })
            expect(relogin.status).toBe(403)
            expect(relogin.body).not.toHaveProperty('token')

            // and reactivating puts everything back
            const on = await setActive(target.id, { active: true })
            expect(on.status).toBe(200)
            expect(on.body.active).toBe(true)

            const after = await supertest(app)
                .post('/auth/login')
                .send({ username: target.username, password: target.password })
            expect(after.status).toBe(200)
            expect(after.body).toHaveProperty('token')
        }, 30000)

        it('forbids a customer from deactivating anyone', async () => {
            const target = await createThrowawayUser()
            const other = await createThrowawayUser()

            const response = await supertest(app)
                .patch(`/users/${target.id}/active`)
                .set('Authorization', `Bearer ${other.token}`)
                .send({ active: false })
            expect(response.status).toBe(403)
        })

        it('ignores active on a customer editing their own account', async () => {
            const target = await createThrowawayUser()
            const response = await supertest(app)
                .patch(`/users/${target.id}`)
                .set('Authorization', `Bearer ${target.token}`)
                .send({ active: false, phone: '555-0199' })
            expect(response.status).toBe(200)
            expect(response.body.phone).toBe('555-0199')
            expect(response.body.active).toBe(true)
        })

        it('rejects a non-boolean active', async () => {
            const target = await createThrowawayUser()
            const response = await setActive(target.id, { active: 'nope' })
            expect(response.status).toBe(400)
        })

        it('404s on a user that does not exist', async () => {
            const response = await setActive(999999, { active: false })
            expect(response.status).toBe(404)
        })

        it('stops an admin from deactivating themselves', async () => {
            const me = await auth(supertest(app).get('/users/1'))
            expect(me.body.role).toBe('admin')

            const response = await setActive(1, { active: false })
            expect(response.status).toBe(400)

            // and johnd is still usable - every other suite logs in as them
            const stillWorks = await login('johnd', 'm38rmF$')
            expect(stillWorks).toBeTruthy()
        })
    })

 })