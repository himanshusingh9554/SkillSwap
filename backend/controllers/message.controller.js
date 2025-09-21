import { Message } from "../models/message.model.js";
import { Chat } from "../models/chat.model.js";


export const sendMessage = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: "Message content required" });
    }

    const newMessage = await Message.create({
      sender: req.user._id,
      content,
      chat: chatId,
    });

    const fullMessage = await Message.findById(newMessage._id)
      .populate("sender", "fullName profilePicture")
      .populate("chat");


    await Chat.findByIdAndUpdate(chatId, { lastMessage: fullMessage._id });

    return res.status(201).json({ success: true, message: fullMessage });
  } catch (error) {
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;

    const messages = await Message.find({ chat: chatId })
      .populate("sender", "fullName profilePicture")
      .sort({ createdAt: 1 });

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};
