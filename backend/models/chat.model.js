
import mongoose, { Schema } from 'mongoose';

const chatSchema = new Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "One-to-One Chat"
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  { timestamps: true }
);

export const Chat = mongoose.model('Chat', chatSchema);