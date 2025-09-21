import express from "express";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { getMyNotifications, markAsRead } from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", verifyJWT, getMyNotifications);

router.put("/:notificationId/read", verifyJWT, markAsRead);

export default router;
