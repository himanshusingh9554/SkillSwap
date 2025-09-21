import mongoose, { Schema } from "mongoose";

const skillSchema = new Schema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
    enum: ["Technology", "Creative", "Lifestyle", "Business", "Other"], 
  },
  skillType: {
    type: String,
    required: true,
    enum: ["Offer", "Request"], 
  },
  credits: {
    type: Number,
    required: true,
    min: 0, 
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

export const Skill = mongoose.model("Skill", skillSchema);