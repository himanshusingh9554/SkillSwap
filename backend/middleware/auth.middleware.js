import jwt from 'jsonwebtoken'
import User from '../models/user.model.js'

export const verifyJWT = async(req,res,next)=>{
    try{
        const headerToken = req.header("Authorization")?.replace("Bearer ","")?.trim();
        const cookieToken = req.cookies?.accessToken?.trim();

        let token = (headerToken && headerToken !== "undefined" && headerToken !== "null") 
            ? headerToken 
            : (cookieToken && cookieToken !== "undefined" && cookieToken !== "null" ? cookieToken : null);

        if(!token){
            return res.status(401).json({message:"Unauthorized request, no token provided"});
        }

        let decodeToken;
        try {
            decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET || 'your-super-secret-key');
        } catch (jwtErr) {
            const altToken = (token === headerToken) ? cookieToken : headerToken;
            if (altToken && altToken !== "undefined" && altToken !== "null" && altToken !== token) {
                try {
                    decodeToken = jwt.verify(altToken, process.env.ACCESS_TOKEN_SECRET || 'your-super-secret-key');
                } catch (altErr) {
                    return res.status(401).json({message:"Invalid or expired access token"});
                }
            } else {
                return res.status(401).json({message: "Invalid access token: " + jwtErr.message});
            }
        }

        const user = await User.findById(decodeToken?.id).select("-password");

        if(!user){
            return res.status(401).json({message:"User not found or invalid token"});
        }

        req.user = user;
        next();
    }catch(error){
        console.error("JWT verification failed:", error.message);
        return res.status(401).json({message: error?.message || "Invalid access"});
    }
}

