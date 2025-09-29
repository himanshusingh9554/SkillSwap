import { Notification } from "../models/notification.model.js";
import { io } from "../index.js"; 
export const createNotification = async (userId, type, content, relatedId, typeRef) => {
  try {
    const notification = await Notification.create({
      user: userId,
      type,
      content,
      relatedId,
      typeRef
    });
 io.to(userId.toString()).emit('new_notification', notification);
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notifications" });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json({ success: false, message: "Failed to update notification" });
  }
};
