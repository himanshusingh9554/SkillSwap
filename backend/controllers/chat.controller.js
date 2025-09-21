import { Chat } from "../models/chat.model.js";

export const accessOrCreateChat = async (req, res) => {
    const { receiverId } = req.body;

    if (!receiverId) {
        return res.status(400).json({ message: "Receiver ID is required" });
    }

    const senderId = req.user._id;

    try {
        let existingChat = await Chat.findOne({
            participants: { $all: [senderId, receiverId] },
        }).populate("participants", "-password");

        if (existingChat) {
            return res.status(200).json({
                message: "Chat accessed successfully",
                data: existingChat 
            });
        }

        const newChat = await Chat.create({
            participants: [senderId, receiverId],
        });

        const fullChat = await Chat.findById(newChat._id).populate("participants", "-password");
        
        return res.status(201).json({
            message: "Chat created successfully",
            data: fullChat 
        });

    } catch (error) {
        console.error("Error in accessing or creating chat:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const getMyChats = async (req, res) => {
    try {
        const chats = await Chat.find({
            participants: { $in: [req.user._id] }
        })
        .populate("participants", "-password")
        .populate("lastMessage")
        .sort({ updatedAt: -1 });

        return res.status(200).json({
            success: true,
            data: chats,
            message: "User chats fetched successfully"
        });

    } catch (error) {
        console.error("Error fetching user chats:", error);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};


export const getChatDetails = async (req, res) => {
    try {
        const { chatId } = req.params;

        const chat = await Chat.findById(chatId)
            .populate("participants", "-password"); 

        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        return res.status(200).json({
            success: true,
            data: chat,
            message: "Chat details fetched successfully"
        });

    } catch (error) {
        console.error("Error fetching chat details:", error);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};