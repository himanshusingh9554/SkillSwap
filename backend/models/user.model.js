import mongoose from 'mongoose'


const userScehma = new mongoose.Schema({
fullName:{
    type:String,
    required:true,
    trim:true,
},
email:{
    type:String,
    required:true,
    unique:true,
    trim:true,
    lowercase:true,
},
password:{
    type:String,
    required:[true,'Password is required']
},
credits:{
    type:Number,
    default:50
},
skills:[{
    type:String,
}],

},{timestamps:true});

 const User = mongoose.model('User',userScehma)
export default User