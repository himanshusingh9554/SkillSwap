import {Router} from 'express'
import { accessOrCreateChat,getMyChats,getChatDetails } from '../controllers/chat.controller.js'
import {verifyJWT} from '../middleware/auth.middleware.js'

const router = Router()

router.use(verifyJWT)

router.route("/").post(accessOrCreateChat)
router.route("/").get(getMyChats);
router.route("/:chatId").get(getChatDetails);
export default router;