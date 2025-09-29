import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { createServer } from "http";
import { Server } from "socket.io";
import connectDb from './config/config.js';
import { Message } from './models/message.model.js';
import { Chat } from './models/chat.model.js';
import userRouter from './routes/user.routes.js';
import skillRouter from './routes/skill.routes.js';
import chatRouter from './routes/chat.routes.js';
import transactionRouter from './routes/transaction.routes.js';
import messageRouter from './routes/message.routes.js';
import { createNotification } from "./controllers/notification.controller.js";
import notificationRouter from './routes/notification.routes.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

export const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN ,
    credentials: true
  }
});

app.use(cors({
    origin: process.env.CORS_ORIGIN || "https://skillswapping11.netlify.app/" ,
    methods: ["GET", "POST", "PUT", "PATCH","DELETE"],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static("public"));
app.use(cookieParser());

app.use('/api/v1/notifications', notificationRouter);

io.on("connection", (socket) => {
  console.log("✅ A user connected:", socket.id);
  socket.on('setup', (userId) => {
    socket.join(userId);
    console.log(`User ${socket.id} is now associated with userId: ${userId}`);
  });
  socket.on("join chat", (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined chat room: ${chatId}`);
  });

  socket.on("new message", async (data) => {
    const { chatId, senderId, content } = data;

    if (!chatId || !senderId || !content) {
      console.log("Invalid data passed for new message:", data);
      return;
    }

    try {
      const newMessage = await Message.create({
        sender: senderId,
        content: content,
        chat: chatId,
      });

      const fullMessage = await Message.findById(newMessage._id)
        .populate("sender", "fullName profilePicture");

      const chat = await Chat.findByIdAndUpdate(
        chatId,
        { lastMessage: fullMessage._id },
        { new: true }
      ).populate("participants", "_id fullName");

      io.to(chatId).emit("message received", fullMessage);

      for (let participant of chat.participants) {
        if (participant._id.toString() !== senderId.toString()) {
         const notification= await createNotification(
            participant._id,
            "MESSAGE",
            `New message from ${fullMessage.sender.fullName}`,
            chatId,
            "Chat"
          );

          io.to(chatId).emit("notification", {
            userId: participant._id,
            type: "MESSAGE",
          });
        }
      }

    } catch (error) {
      console.error("Error handling new message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

app.use('/api/v1/users', userRouter);
app.use('/api/v1/skills', skillRouter);
app.use('/api/v1/chats', chatRouter);
app.use('/api/v1/transactions', transactionRouter);
app.use('/api/v1/messages', messageRouter);

app.get('/', (req, res) => {
  res.send('SkillSwap server is running! 🚀');
});

connectDb()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server with chat is running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed! Server is not starting.", err);
  });
