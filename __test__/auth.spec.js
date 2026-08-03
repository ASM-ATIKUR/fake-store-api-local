const supertest = require('supertest')
const app = require('../app')
const jwt = require('jsonwebtoken')

describe('testing auth API',()=>{
    it('login with valid credentials',async()=>{
        const response = await supertest(app).post('/auth/login').send({
            username:'johnd',
            password:'m38rmF$'
        })
        expect(response.status).toBe(200)
        console.log(response.body)
        expect(response.body).toHaveProperty('token')

        const payload = jwt.verify(response.body.token, process.env.JWT_SECRET || 'secret_key')
        expect(payload).toHaveProperty('id')
        expect(payload).toHaveProperty('role')
        expect(payload.user).toBe('johnd')
    },30000)


    it('login with a wrong password',async()=>{
        const response = await supertest(app).post('/auth/login').send({
            username:'johnd',
            password:'not-the-password'
        })
        expect(response.status).toBe(401)
        expect(response.body).not.toHaveProperty('token')
    })


    it('login without a password',async()=>{
        const response = await supertest(app).post('/auth/login').send({
            username:'johnd'
        })
        expect(response.status).toBe(400)
        expect(response.body).not.toHaveProperty('token')
    })


    it('login with an empty body',async()=>{
        const response = await supertest(app).post('/auth/login').send({})
        expect(response.status).toBe(400)
        expect(response.body).not.toHaveProperty('token')
    })
})
