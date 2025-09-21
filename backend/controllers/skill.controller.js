import { Skill } from "../models/skill.model.js";
import mongoose from "mongoose"; 

export const createSkill = async (req, res) => {
  const { title, description, category, skillType, credits } = req.body;
  if (!title || !description || !category || !skillType || credits === undefined) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const ownerId = req.user._id;

  try {
    const newSkill = await Skill.create({
      owner: ownerId,
      title,
      description,
      category,
      skillType,
      credits,
    });

    return res
      .status(201)
      .json({ message: "Skill listed successfully", skill: newSkill });

  } catch (error) {
    console.error("Error creating skill:", error);
    return res.status(500).json({ message: "Something went wrong while creating the skill" });
  }
};


export const getAllSkills = async (req, res) => {
  try {
    const skills = await Skill.find({ isActive: true }).populate(
      "owner",
      "fullName profilePicture"
    );

   // if (!skills || skills.length === 0) {
    //  return res.status(404).json({ message: "No active skills found" });
   // }

    return res
      .status(200)
      .json({ 
        message: "Skills fetched successfully", 
        count: skills.length, 
        skills 
      });

  } catch (error) {
    console.error("Error fetching skills:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getSkillById = async (req, res) => {
  const { skillId } = req.params; 
  if (!mongoose.Types.ObjectId.isValid(skillId)) {
      return res.status(400).json({ message: "Invalid Skill ID format" });
  }

  try {
    const skill = await Skill.findById(skillId).populate(
      "owner",
      "fullName profilePicture"
    );

    if (!skill) {
      return res.status(404).json({ message: "Skill not found" });
    }

    return res
      .status(200)
      .json({ message: "Skill details fetched successfully", skill });

  } catch (error) {
    console.error("Error fetching skill by ID:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateSkill = async (req, res) => {
  const { skillId } = req.params;
  const { title, description, category, credits } = req.body;

  if (!mongoose.Types.ObjectId.isValid(skillId)) {
    return res.status(400).json({ message: "Invalid Skill ID format" });
  }

  try {
    const skill = await Skill.findById(skillId);

    if (!skill) {
      return res.status(404).json({ message: "Skill not found" });
    }

    if (skill.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden: You are not authorized to update this skill" });
    }

    const updatedSkill = await Skill.findByIdAndUpdate(
      skillId,
      {
        $set: {
          title,
          description,
          category,
          credits,
        },
      },
      { new: true } 
    );

    return res
      .status(200)
      .json({ message: "Skill updated successfully", skill: updatedSkill });

  } catch (error) {
    console.error("Error updating skill:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};


export const deleteSkill = async (req, res) => {
  const { skillId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(skillId)) {
    return res.status(400).json({ message: "Invalid Skill ID format" });
  }
  
  try {
    const skill = await Skill.findById(skillId);

    if (!skill) {
      return res.status(404).json({ message: "Skill not found" });
    }


    if (skill.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden: You are not authorized to delete this skill" });
    }

    await Skill.findByIdAndDelete(skillId);

    return res.status(200).json({ message: "Skill deleted successfully" });

  } catch (error) {
    console.error("Error deleting skill:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getMySkills = async (req, res) => {
   const { search = "" } = req.query; 
  try {
    const skills = await Skill.find({
      isActive: true,
      title: { $regex: search, $options: "i" } 
    }).populate("owner", "fullName profilePicture");
    
    return res.status(200).json({ skills });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};