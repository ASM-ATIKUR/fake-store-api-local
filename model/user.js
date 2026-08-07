const mongoose = require('mongoose')
const schema = mongoose.Schema

const userSchema = new schema({
    id:{
        type:Number,
        required:true
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