import { Transaction } from '../models/transaction.model.js';
import { Skill } from '../models/skill.model.js';
import { createNotification } from './notification.controller.js'; 
import  User  from '../models/user.model.js';
import mongoose from 'mongoose';


export const initiateTransaction = async (req, res) => {
    const { skillId } = req.body;
    const seekerId = req.user._id; 
    try {
        const skill = await Skill.findById(skillId);
        if (!skill) {
            return res.status(404).json({ message: "Skill not found" });
        }

        const seeker = await User.findById(seekerId);

        if (skill.owner.toString() === seekerId.toString()) {
            return res.status(400).json({ message: "You cannot request your own skill" });
        }

        if (seeker.credits < skill.credits) {
            return res.status(400).json({ message: "Insufficient credits" });
        }

        const newTransaction = await Transaction.create({
            skill: skillId,
            seeker: seekerId,
            provider: skill.owner,
            credits: skill.credits,
            status: 'pending', 
        });

        await createNotification(
            skill.owner, 
            'TRANSACTION', 
            `${seeker.fullName} has requested your skill: "${skill.title}"`, 
            newTransaction._id,
            'Transaction' 
        );

        return res.status(201).json({ 
            message: "Transaction initiated successfully. Waiting for provider's approval.",
            transaction: newTransaction
        });

    } catch (error) {
        console.error("Error initiating transaction:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};
export const acceptTransaction = async (req, res) => {
  const { transactionId } = req.params;
  const loggedInUserId = req.user._id;

  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
 
    if (transaction.provider.toString() !== loggedInUserId.toString()) {
      return res.status(403).json({ message: "Forbidden: Only the skill provider can accept this transaction" });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: `Cannot accept a transaction with status: ${transaction.status}` });
    }

    transaction.status = 'accepted';
    await transaction.save();

    return res.status(200).json({ message: "Transaction accepted successfully", transaction });
  } catch (error) {
    console.error("Error accepting transaction:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};


export const completeTransaction = async (req, res) => {
  const { transactionId } = req.params;
  const loggedInUserId = req.user._id;

  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }
 
    if (transaction.seeker.toString() !== loggedInUserId.toString()) {
      return res.status(403).json({ message: "Forbidden: Only the skill seeker can complete this transaction" });
    }

    if (transaction.status !== 'accepted') {
        return res.status(400).json({ message: `Cannot complete a transaction with status: ${transaction.status}` });
    }

  
    await User.findByIdAndUpdate(transaction.seeker, { $inc: { credits: -transaction.credits } });
    await User.findByIdAndUpdate(transaction.provider, { $inc: { credits: +transaction.credits } });

    transaction.status = 'completed';
    await transaction.save();

    return res.status(200).json({ 
        message: "Transaction completed successfully! Credits have been transferred.", 
        transaction 
    });
    
  } catch (error) {
    console.error("Error completing transaction:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const cancelTransaction = async (req, res) => {
    const { transactionId } = req.params;
    const loggedInUserId = req.user._id;

    try {
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({ message: "Transaction not found" });
        }
       
        if (transaction.seeker.toString() !== loggedInUserId.toString() && transaction.provider.toString() !== loggedInUserId.toString()) {
            return res.status(403).json({ message: "Forbidden: You are not part of this transaction" });
        }
        if (!['pending', 'accepted'].includes(transaction.status)) {
            return res.status(400).json({ message: `Cannot cancel a transaction with status: ${transaction.status}` });
        }

        transaction.status = 'cancelled';
        await transaction.save();
        
        return res.status(200).json({ message: "Transaction cancelled successfully", transaction });
    } catch (error) {
        console.error("Error cancelling transaction:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
};

export const getMyTransactions = async (req, res) => {
  const loggedInUserId = req.user._id;
  try {
    const transactions = await Transaction.find({
      $or: [{ seeker: loggedInUserId }, { provider: loggedInUserId }],
    })
    .populate('skill', 'title') 
    .populate('seeker', 'fullName') 
    .populate('provider', 'fullName') 
    .sort({ createdAt: -1 }); 

    return res.status(200).json({
      message: "Transactions fetched successfully",
      transactions,
    });
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};