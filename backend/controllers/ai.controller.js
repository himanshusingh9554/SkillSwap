/**
 * ============================================================
 * SkillSwap AI Controller — Intelligent Chatbot & Platform AI
 * ============================================================
 * 
 * Powered by:
 *   - In-Memory Vector Store (Dense Gemini Embeddings + TF-IDF Cosine Similarity)
 *   - Grounded context from projectKnowledge.json
 *   - Google Gemini API with multi-model fallback & direct knowledge fallback
 * 
 * Endpoints:
 *   POST /api/v1/ai/chat            → SkillSwap Q&A Chatbot (Vector Search + LLM)
 *   POST /api/v1/ai/tutor           → Chatbot alias for backward compatibility
 *   POST /api/v1/ai/match           → Semantic skill matching
 *   POST /api/v1/ai/enhance-skill   → AI listing enhancer
 *   POST /api/v1/ai/generate-roadmap→ AI curriculum generator
 *   GET  /api/v1/ai/models          → Available candidate models list
 *   GET  /api/v1/ai/rag-stats       → Vector DB & Knowledge stats
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getRetriever, getKnowledgeBaseStats } from '../utils/knowledgeBase.js';
import { Skill } from '../models/skill.model.js';

// ──────────────────────────────────────────────
// CANDIDATE MODELS ORDERED BY COMPATIBILITY
// ──────────────────────────────────────────────

export const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash'
];

let genAI = null;

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Generate AI content trying all candidate models in sequence
 * @param {string} prompt 
 * @param {string|null} preferredModel - Optional model requested by client
 * @returns {Promise<{ text: string, modelUsed: string }>}
 */
async function generateAIContent(prompt, preferredModel = null) {
  const client = getGenAI();
  if (!client) {
    throw new Error('GEMINI_API_KEY is not configured in .env');
  }

  // If client passes preferred model, prioritize it first
  const targetModel = preferredModel || process.env.GEMINI_MODEL;
  const modelsToTry = targetModel
    ? [targetModel, ...CANDIDATE_MODELS.filter(m => m !== targetModel)]
    : CANDIDATE_MODELS;

  let lastError = null;
  console.log(`[Gemini AI] 📋 Attempting generation across candidate models (${modelsToTry.join(', ')})...`);

  for (const modelName of modelsToTry) {
    try {
      console.log(`[Gemini AI] 🔄 Trying model: "${modelName}"...`);
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log(`[Gemini AI] ✅ SUCCESS with model: "${modelName}" (${text.length} chars generated)`);
      return { text, modelUsed: modelName };
    } catch (err) {
      lastError = err;
      const errMsg = err.message ? err.message.split('\n')[0] : 'Unknown error';
      console.warn(`[Gemini AI] ⚠️ Model "${modelName}" failed: ${errMsg}. Trying next candidate model...`);
    }
  }

  console.error('[Gemini AI] ❌ All candidate models failed. Last error:', lastError?.message?.split('\n')[0]);
  throw lastError;
}

// ──────────────────────────────────────────────
// CORE RAG PIPELINE (Vector Retrieval + Gemini)
// ──────────────────────────────────────────────

/**
 * Perform Vector Search and generate grounded answer with multi-model fallback
 */
async function ragQuery(userQuery, systemPrompt, topK = 3, requestedModel = null) {
  const retriever = getRetriever();

  // 1. Vector Search for relevant items in projectKnowledge.json
  const retrievedChunks = await retriever.retrieve(userQuery, topK);

  // 2. Build Context String from matched items
  const contextString = retrievedChunks.length > 0
    ? retrievedChunks.map((r, i) => `[Source ${i + 1}: ${r.title} (${r.category}) - Relevance: ${(r.score * 100).toFixed(0)}%]\n${r.content}`).join('\n\n---\n\n')
    : 'No direct match found in the knowledge base.';

  // 3. Try Gemini with candidate models loop
  try {
    const fullPrompt = `${systemPrompt}

## SkillSwap Platform Knowledge (Retrieved via Vector DB):
${contextString}

## User Question:
${userQuery}

## Instructions:
- Answer accurately based on the retrieved SkillSwap platform knowledge above.
- If the retrieved context contains the answer, explain it clearly and concisely.
- Maintain a friendly, supportive tone.
- Do not mention other people or unrelated resume information.`;

    const { text, modelUsed } = await generateAIContent(fullPrompt, requestedModel);

    return {
      reply: text,
      sources: retrievedChunks.map(r => ({
        title: r.title,
        category: r.category,
        chunk: r.content,
        score: r.score,
      })),
      mode: 'vector_rag_llm',
      modelUsed,
      availableModels: CANDIDATE_MODELS,
    };
  } catch (err) {
    console.warn('[AI Service] Gemini LLM unavailable, using Direct Vector DB Knowledge:', err.message);

    // 4. Smart Direct Knowledge Fallback (When API key has errors or models are busy)
    if (retrievedChunks.length > 0 && retrievedChunks[0].score >= 0.1) {
      const best = retrievedChunks[0];
      return {
        reply: `**${best.title}**\n\n${best.content}`,
        sources: retrievedChunks.map(r => ({
          title: r.title,
          category: r.category,
          chunk: r.content,
          score: r.score,
        })),
        mode: 'vector_db_direct',
        modelUsed: 'in-memory-vector-store',
        availableModels: CANDIDATE_MODELS,
      };
    }

    return {
      reply: "SkillSwap is a peer-to-peer skill exchange platform where members teach skills to earn credits and use credits to learn from others. You can ask me about credits, skill requests, chat, or transaction statuses!",
      sources: [],
      mode: 'fallback_generic',
      modelUsed: 'in-memory-vector-store',
      availableModels: CANDIDATE_MODELS,
    };
  }
}

// ──────────────────────────────────────────────
// ENDPOINT: SkillSwap Chatbot (Chat & Tutor)
// ──────────────────────────────────────────────

export const aiChat = async (req, res) => {
  const { message, model } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    const systemPrompt = `You are the official SkillSwap AI Assistant. 
You help users understand how the SkillSwap platform works, including:
- Credits (50 free welcome credits, earning, spending, escrow)
- Skill swap transactions (Pending -> Accepted -> Completed, cancellations)
- Skills publishing and browsing (Offer vs Request, Categories)
- Real-time chat & socket messaging
- Safety, community guidelines, and best practices.`;

    const result = await ragQuery(message, systemPrompt, 3, model);

    return res.status(200).json({
      reply: result.reply,
      ragSources: result.sources,
      mode: result.mode,
      modelUsed: result.modelUsed,
      availableModels: result.availableModels,
      ragStats: getKnowledgeBaseStats(),
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    return res.status(500).json({ message: 'AI Chat error: ' + error.message });
  }
};

export const aiTutor = aiChat; // Alias for backward compatibility with AICoachWidget

// ──────────────────────────────────────────────
// ENDPOINT: Available Models List
// ──────────────────────────────────────────────

export const getAvailableModels = async (req, res) => {
  return res.status(200).json({
    models: CANDIDATE_MODELS,
    defaultModel: CANDIDATE_MODELS[0],
    activeEnvModel: process.env.GEMINI_MODEL || CANDIDATE_MODELS[0],
  });
};

// ──────────────────────────────────────────────
// ENDPOINT: AI Smart Matcher
// ──────────────────────────────────────────────

export const aiMatch = async (req, res) => {
  const { query, model } = req.body;

  if (!query || !query.trim()) {
    return res.status(400).json({ message: 'Query is required' });
  }

  try {
    const allSkills = await Skill.find({ isActive: true })
      .populate('owner', 'fullName profilePicture')
      .lean();

    if (allSkills.length === 0) {
      return res.status(200).json({
        matches: [],
        aiAdvice: 'No skills are currently listed on the platform. Be the first to publish one!',
      });
    }

    try {
      const skillDescriptions = allSkills.map((s, i) =>
        `[${i}] "${s.title}" (${s.category}, ${s.skillType}, ${s.credits} credits) by ${s.owner?.fullName || 'User'}: ${s.description}`
      ).join('\n');

      const prompt = `You are an AI skill matchmaker for SkillSwap.
A user wants: "${query}"
Available skills:
${skillDescriptions}

Select top matches. Return ONLY valid JSON:
{
  "matchIndices": [0, 1],
  "aiAdvice": "Why these skills match the request"
}`;

      const { text, modelUsed } = await generateAIContent(prompt, model);
      const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const matchedSkills = (parsed.matchIndices || [])
        .filter(idx => idx >= 0 && idx < allSkills.length)
        .map(idx => allSkills[idx]);

      return res.status(200).json({
        matches: matchedSkills.length > 0 ? matchedSkills : allSkills.slice(0, 3),
        aiAdvice: parsed.aiAdvice || 'Recommended matches based on your query.',
        modelUsed,
      });
    } catch {
      // Smart Keyword Matcher Fallback
      const qLower = query.toLowerCase();
      const filtered = allSkills.filter(s =>
        s.title.toLowerCase().includes(qLower) ||
        s.category.toLowerCase().includes(qLower) ||
        (s.description && s.description.toLowerCase().includes(qLower))
      );

      return res.status(200).json({
        matches: filtered.length > 0 ? filtered.slice(0, 4) : allSkills.slice(0, 3),
        aiAdvice: `Found skills matching your interest in "${query}". Click 'Request Skill' to connect!`,
        modelUsed: 'heuristic-matcher',
      });
    }
  } catch (error) {
    console.error('AI Match error:', error);
    return res.status(500).json({ message: 'AI match error: ' + error.message });
  }
};

// ──────────────────────────────────────────────
// ENDPOINT: AI Skill Enhancer
// ──────────────────────────────────────────────

export const aiEnhanceSkill = async (req, res) => {
  const { title, description, model } = req.body;

  if (!title || !description) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  try {
    try {
      const prompt = `You are a copywriter for SkillSwap.
Draft Title: "${title}"
Draft Description: "${description}"

Enhance this into a structured, professional listing. Return ONLY valid JSON:
{
  "title": "Enhanced title (max 60 chars)",
  "description": "Engaging description explaining what learners will achieve (150-300 chars)",
  "category": "Technology",
  "credits": 25,
  "keyOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3"]
}`;

      const { text, modelUsed } = await generateAIContent(prompt, model);
      const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const enhanced = JSON.parse(cleanJson);
      return res.status(200).json({ enhanced, modelUsed });
    } catch {
      // Smart Fallback
      return res.status(200).json({
        enhanced: {
          title: `Master ${title.trim()}`,
          description: `${description.trim()} In this hands-on exchange, you will learn core concepts, practical techniques, and real-world tips through interactive 1-on-1 sessions.`,
          category: 'Technology',
          credits: 20,
          keyOutcomes: [
            `Core fundamentals of ${title}`,
            'Interactive guidance & live practice',
            'Practical takeaways & resource sharing'
          ]
        },
        modelUsed: 'smart-template-engine'
      });
    }
  } catch (error) {
    console.error('AI Enhance error:', error);
    return res.status(500).json({ message: 'AI Enhance error: ' + error.message });
  }
};

// ──────────────────────────────────────────────
// ENDPOINT: AI Swap Roadmap Generator
// ──────────────────────────────────────────────

export const aiGenerateRoadmap = async (req, res) => {
  const { mySkill, partnerSkill, weeks = 4, model } = req.body;

  if (!mySkill || !partnerSkill) {
    return res.status(400).json({ message: 'Both skills are required' });
  }

  try {
    try {
      const prompt = `Create a ${weeks}-week bilateral learning roadmap between two partners on SkillSwap:
Partner A teaches: "${mySkill}"
Partner B teaches: "${partnerSkill}"

Return ONLY valid JSON:
{
  "summary": "Brief roadmap goal",
  "recommendedSessionMinutes": 60,
  "schedule": [
    {
      "week": 1,
      "focus": "Core Principles",
      "sessionA": "What Partner A covers",
      "sessionB": "What Partner B covers",
      "milestone": "Goal by end of week"
    }
  ],
  "successTips": ["Tip 1", "Tip 2"]
}`;

      const { text, modelUsed } = await generateAIContent(prompt, model);
      const cleanJson = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const roadmap = JSON.parse(cleanJson);
      return res.status(200).json({ roadmap, modelUsed });
    } catch {
      // Smart Fallback Roadmap
      const schedule = [];
      for (let w = 1; w <= weeks; w++) {
        schedule.push({
          week: w,
          focus: `Week ${w}: Skill Fundamentals & Practice`,
          sessionA: `Hands-on session on ${mySkill} key concepts (Part ${w})`,
          sessionB: `Hands-on session on ${partnerSkill} key concepts (Part ${w})`,
          milestone: `Complete practice exercise for Week ${w}`
        });
      }

      return res.status(200).json({
        roadmap: {
          summary: `A structured ${weeks}-week exchange exchanging ${mySkill} and ${partnerSkill}.`,
          recommendedSessionMinutes: 60,
          schedule,
          successTips: [
            'Agree on meeting times in chat before each session.',
            'Give equal time to both skills.',
            'Prepare questions beforehand to maximize learning.'
          ]
        },
        modelUsed: 'curriculum-template-engine'
      });
    }
  } catch (error) {
    console.error('AI Roadmap error:', error);
    return res.status(500).json({ message: 'AI Roadmap error: ' + error.message });
  }
};

// ──────────────────────────────────────────────
// ENDPOINT: Vector DB & RAG Stats
// ──────────────────────────────────────────────

export const getRagStats = async (req, res) => {
  try {
    const stats = getKnowledgeBaseStats();
    return res.status(200).json({
      stats: {
        ...stats,
        candidateModels: CANDIDATE_MODELS,
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get stats' });
  }
};
