const supertest = require('supertest')
const app = require('../app')
const { loginAdmin } = require('./helpers/login')

describe('testing user API',()=>{
    let adminToken
    // seed.js only keeps the admin and the customer, so the write tests below
    // operate on the throwaway user created by 'add a new user'.
    let scratchUserId

    beforeAll(async () => {
        adminToken = await loginAdmin()
    }, 30000)

    it('get all users',async()=>{
        const response = await supertest(app).get('/users')
        expect(response.status).toBe(200)
        console.log(response.body)
        expect(response.body).not.toStrictEqual([]);
    })


    it('get a single user',async ()=>{
        const response = await supertest(app).get('/users/1')
        expect(response.status).toBe(200);
        console.log(response.body)
        expect(response.body).not.toStrictEqual({});
        expect(response.body.name).toHaveProperty('firstname');
    },30000)

    it("get users in a limit and sort", async () => {
        const response = await supertest(app).get("/users?limit=2&sort=desc")
        expect(response.status).toBe(200)
        console.log('get with querystring', response.body)
        expect(response.body).not.toStrictEqual([])
        expect(response.body).toHaveLength(2);
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
   
 })