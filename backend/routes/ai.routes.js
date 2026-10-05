/**
 * SkillSwap AI Routes
 * 
 * Endpoints:
 *   POST /api/v1/ai/chat            → SkillSwap Q&A Chatbot (Vector Search + LLM)
 *   POST /api/v1/ai/tutor           → Chatbot alias for backward compatibility
 *   POST /api/v1/ai/match           → Semantic skill matcher
 *   POST /api/v1/ai/enhance-skill   → AI skill description enhancer
 *   POST /api/v1/ai/generate-roadmap→ AI learning roadmap generator
 *   GET  /api/v1/ai/models          → Available candidate models list
 *   GET  /api/v1/ai/rag-stats       → Vector DB & knowledge base statistics
 */

import { Router } from 'express';
import {
  aiChat,
  aiTutor,
  aiMatch,
  aiEnhanceSkill,
  aiGenerateRoadmap,
  getAvailableModels,
  getRagStats,
} from '../controllers/ai.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';

const router = Router();

// Chatbot Q&A endpoints (accessible to all visitors & logged-in users)
router.route('/chat').post(aiChat);
router.route('/tutor').post(aiChat);

// Model list & selection
router.route('/models').get(getAvailableModels);

// AI Tools for Authenticated Users
router.route('/match').post(verifyJWT, aiMatch);
router.route('/enhance-skill').post(verifyJWT, aiEnhanceSkill);
router.route('/generate-roadmap').post(verifyJWT, aiGenerateRoadmap);

// Vector DB & Knowledge Statistics
router.route('/rag-stats').get(getRagStats);

export default router;
