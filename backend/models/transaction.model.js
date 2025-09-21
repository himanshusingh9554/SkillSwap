import mongoose, { Schema } from 'mongoose';

const transactionSchema = new Schema(
  {
    skill: {
      type: Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
    },
    seeker: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    credits: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'completed', 'cancelled', 'disputed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export const Transaction = mongoose.model('Transaction', transactionSchema);