import { Router } from 'express';
import { createSkill,getAllSkills,getSkillById,updateSkill,deleteSkill,getMySkills } from '../controllers/skill.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();

router.route("/create").post(verifyJWT, createSkill);
router.route("/").get(getAllSkills); 
router.route("/my-skills").get(getMySkills);

router
  .route("/:skillId")
  .get(getSkillById) 
  .patch(verifyJWT, updateSkill) 
  .delete(verifyJWT, deleteSkill); 

export default router;