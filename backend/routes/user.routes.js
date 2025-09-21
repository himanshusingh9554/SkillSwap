import {Router} from 'express'
import { loginUser, registerUser,logoutUser, getCurrentUser, updateUserAvatar,getUserProfile } from '../controllers/user.controller.js'
import { verifyJWT } from '../middleware/auth.middleware.js'
import {upload} from '../middleware/multer.middleware.js'

const router = Router()

router.route('/register').post(registerUser)
router.route('/login').post(loginUser)
router.route('/logout').post(verifyJWT, logoutUser);
router.route('/me').get(verifyJWT,getCurrentUser);
router.route('/update-details').patch(verifyJWT,updateUserAvatar)
router.route("/profile/:userId").get(getUserProfile);
router.route('/update-avatar').patch(
    verifyJWT,
    upload.single("avatar"),
    updateUserAvatar
) 
export default router

