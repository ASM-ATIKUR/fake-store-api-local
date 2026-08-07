const mongoose = require('mongoose')
const schema = mongoose.Schema

const userSchema = new schema({
    // unique because util/auth.js resolves the caller by id on every request:
    // two accounts sharing one would let a token authenticate as the wrong user.
    // controller/user.js retries signup when this index rejects a racing id.
    id:{
        type:Number,
        required:true,
        unique:true
    },
    email:{
        type:String,
        required:true
    },
    username:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    name:{
        firstname:{
            type:String,
            required:true
        },
        lastname:{
            type:String,
            required:true
        }
    },
    address:{
        city:String,
        street:String,
        number:Number,
        zipcode:String,
        geolocation:{
            lat:String,
            long:String
        }
    },
    phone:String,
    role:{
        type:String,
        enum:['customer','admin'],
        default:'customer'
    },
    // an admin can deactivate an account instead of deleting it: a deactivated
    // user cannot log in, and any token it already holds stops working
    active:{
        type:Boolean,
        default:true
    }
})

module.exports = mongoose.model('user',userSchema)