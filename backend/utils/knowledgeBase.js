/**
 * ============================================================
 * SkillSwap Knowledge Base Manager
 * ============================================================
 * 
 * Manages platform documentation and vector store indexing:
 *  - Eager initialization of project knowledge at server startup
 *  - Integrates with VectorStore for semantic & keyword search
 *  - All personal resume references removed
 */

import path from 'path';
import { vectorStore } from './vectorStore.js';

/**
 * Initialize knowledge base and vector store
 */
export async function initializeKnowledgeBase() {
  const jsonPath = path.join(process.cwd(), 'data', 'projectKnowledge.json');
  await vectorStore.initialize(jsonPath);
}

/**
 * Search the knowledge base using vector similarity
 * @param {string} query 
 * @param {number} topK 
 */
export async function searchKnowledgeBase(query, topK = 3) {
  return await vectorStore.search(query, topK);
}

/**
 * Get the shared vector store instance
 */
export function getRetriever() {
  return {
    retrieve: async (query, topK = 3) => {
      const results = await vectorStore.search(query, topK);
      return results.map(r => ({
        chunk: `[${r.category}] ${r.title}\n${r.content}`,
        score: r.score,
        title: r.title,
        category: r.category,
        content: r.content,
      }));
    },
    getStats: () => vectorStore.getStats(),
  };
}

/**
 * Get knowledge base stats
 */
export function getKnowledgeBaseStats() {
  return {
    ...vectorStore.getStats(),
    sources: ['SkillSwap Platform Knowledge (projectKnowledge.json)'],
  };
}
