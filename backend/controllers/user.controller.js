import User from '../models/user.model.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {Skill} from '../models/skill.model.js'


export const registerUser = async(req,res)=>{
    const {fullName,email,password}=req.body
    if(!fullName || !email || !password){
        return res.status(400).json({message:'All fields are required'})
    }
    try{
        const existingUser = await User.findOne({email})
        if(existingUser){
           return res.status(409).json({message:'User with this email already'})
        }
        const hashedPassword = await bcrypt.hash(password,10)
        const newUser=await User.create({
            fullName,
            email,
            password:hashedPassword,
        })
        const createdUser = await User.findById(newUser._id).select("-password")
        return res.status(201).json({
            message:'User registered successfully',
            user:createdUser
        })
    }catch(error){
        console.log("Error in user registeration:",error)
        res.status(500).json({message:'Smething went wrong'})
    }
}

export const loginUser = async(req,res)=>{
    const {email,password}=req.body
    if(!email || !password){
        return res.status(400).json({message:'All fields are required'})
    }
    try{
        const user = await User.findOne({email})
        if(!user){
           return res.status(404).json({message:'User with this email not found'})
        }
        const isPassword = await bcrypt.compare(password,user.password)
            if(!isPassword){
           return res.status(401).json({message:'password does not match'})
        }
        const accessToken = jwt.sign({
            id:user._id,
            email:user.email,
            fullName:user.fullName
        },process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn:process.env.ACCESS_TOKEN_EXPIRY,
    })
        const loggingIn = await User.findById(user._id).select("-password")
        const options={
            httpOnly:true,
            secure:true,
        }
        return res.status(200).cookie("accessToken",accessToken,options).json({
            message:'Userlogin successfully',user:loggingIn,accessToken
        })
    }catch(error){
        console.log("Error in user login:",error)
        return res.status(500).json({message:'Smething went wrong'})
    }
}
export const getCurrentUser = async (req, res) => {
  return res
    .status(200)
    .json({
      message: "Current user fetched successfully",
      user: req.user
    });
};
export const logoutUser = async (req, res) => {
  return res
    .status(200)
    .clearCookie("accessToken", { httpOnly: true, secure: true })
    .json({ message: "User logged out successfully" });
};

export const updateUserDetails = async(req,res)=>{
    const {fullName,skills} = req.body
    if(!fullName && !skills){
        return res.status(400).json({message:'At least one field is required'})
    }
const skillsArray =Array.isArray(skills) ? skills: (skills ? skills.split(',').map(s=>s.trim()):undefined);

const user = await User.findByIdAndUpdate(
    req.user._id,
    {
        $set:{
            fullName,
            skills:skillsArray,
        }
    },{new:true}
).select("-password");
return res.status(200).json({message:"User details updated ",user})

}

export const updateUserAvatar = async(req,res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        return res.status(400).json({message:"Avatar file is missing"})
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                profilePicture:avatarLocalPath
            }
        },{new:true}
    ).select("-password")

    return res.status(200).json({message:"Avatar updated ",user})
};

export const getUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select("-password -refreshToken");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const skills = await Skill.find({ owner: userId, isActive: true });

        return res.status(200).json({
            message: "User profile fetched successfully",
            data: {
                user,
                skills
            }
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};