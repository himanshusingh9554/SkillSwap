import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true, 
    },
    type: {
      type: String,
      enum: ["MESSAGE", "TRANSACTION", "SKILL"], 
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedId: {
      type: Schema.Types.ObjectId, 
      refPath: "typeRef",
    },
    typeRef: {
      type: String,
      enum: ["Chat", "Transaction", "Skill"],
    },
  },
  { timestamps: true }
);

export const Notification = mongoose.model("Notification", notificationSchema);
