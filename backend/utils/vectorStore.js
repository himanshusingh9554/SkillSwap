/**
 * ============================================================
 * SkillSwap In-Memory Vector Store & Embedding Engine
 * ============================================================
 * 
 * Handles:
 *  1. Ingestion of structured knowledge from projectKnowledge.json
 *  2. Dual-mode Vector Embedding:
 *     - Primary: Google Gemini 'text-embedding-004' (768-dim dense vectors)
 *     - Fallback: In-memory normalized TF-IDF / N-gram sparse vectors
 *  3. Cosine Similarity search over document vectors
 *  4. Top-K context retrieval for chatbot and Q&A
 */

import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Common stopwords for text normalization
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'to', 'of', 'in',
  'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off',
  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'or', 'if',
  'while', 'because', 'until', 'that', 'which', 'who', 'whom', 'this',
  'these', 'those', 'it', 'its', 'i', 'me', 'my', 'we', 'our', 'you',
  'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what'
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\.]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOPWORDS.has(token));
}

/**
 * Cosine similarity between two dense float arrays
 */
function denseCosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Cosine similarity between two sparse object vectors { term: weight }
 */
function sparseCosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const term in vecA) {
    if (vecB[term]) {
      dotProduct += vecA[term] * vecB[term];
    }
    normA += vecA[term] * vecA[term];
  }

  for (const term in vecB) {
    normB += vecB[term] * vecB[term];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export class VectorStore {
  constructor() {
    this.documents = [];       // { id, title, category, content, keywords, text, vector }
    this.embeddingMode = 'fallback'; // 'gemini' or 'fallback'
    this.vocabulary = new Set();
    this.idf = {};
    this.isReady = false;
  }

  /**
   * Helper to get Google Gemini Embedding Client
   */
  _getGeminiEmbeddingModel() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      return genAI.getGenerativeModel({ model: 'text-embedding-004' });
    } catch {
      return null;
    }
  }

  /**
   * Generates embedding for text.
   * Tries Gemini text-embedding-004 first, falls back to sparse vector.
   */
  async _embedText(text) {
    const model = this._getGeminiEmbeddingModel();
    if (model) {
      try {
        const result = await model.embedContent(text);
        if (result?.embedding?.values) {
          return { type: 'dense', vector: result.embedding.values };
        }
      } catch (err) {
        // Silently fall back to algorithmic sparse vector
      }
    }

    // Algorithmic Fallback Vector (TF-IDF based)
    const tokens = tokenize(text);
    const tf = {};
    for (const t of tokens) {
      tf[t] = (tf[t] || 0) + 1;
    }

    const vector = {};
    const totalTerms = tokens.length || 1;
    for (const t in tf) {
      const freq = tf[t] / totalTerms;
      vector[t] = freq * (this.idf[t] || 1);
    }

    return { type: 'sparse', vector };
  }

  /**
   * Initialize Vector Store from JSON knowledge file
   */
  async initialize(jsonFilePath) {
    try {
      console.log('🧠 Loading SkillSwap Knowledge Base into Vector Store...');
      
      const filePath = jsonFilePath || path.join(process.cwd(), 'data', 'projectKnowledge.json');
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Knowledge file not found at ${filePath}`);
        return;
      }

      const raw = fs.readFileSync(filePath, 'utf-8');
      const items = JSON.parse(raw);

      // Pre-compute IDF on the corpus
      const tokenizedDocs = [];
      const df = {};

      for (const item of items) {
        const combinedText = `${item.title} ${item.category} ${item.content} ${(item.keywords || []).join(' ')}`;
        const tokens = tokenize(combinedText);
        tokenizedDocs.push({ item, combinedText, tokens });

        const uniqueTokens = new Set(tokens);
        for (const t of uniqueTokens) {
          this.vocabulary.add(t);
          df[t] = (df[t] || 0) + 1;
        }
      }

      const totalDocs = tokenizedDocs.length;
      for (const term of this.vocabulary) {
        this.idf[term] = Math.log(totalDocs / (df[term] || 1)) + 1;
      }

      // Test if Gemini embedding is active
      const testEmbed = await this._embedText('SkillSwap test query');
      this.embeddingMode = testEmbed.type === 'dense' ? 'gemini-embedding-004' : 'tfidf-vectorizer';

      // Vectorize each item
      this.documents = [];
      for (const { item, combinedText } of tokenizedDocs) {
        const embedResult = await this._embedText(combinedText);
        this.documents.push({
          ...item,
          text: combinedText,
          vectorType: embedResult.type,
          vector: embedResult.vector,
        });
      }

      this.isReady = true;
      console.log(`✅ Vector Store Ready! Indexed ${this.documents.length} knowledge items using [${this.embeddingMode}]`);
    } catch (err) {
      console.error('❌ Error initializing Vector Store:', err.message);
    }
  }

  /**
   * Query the Vector Store for relevant answers
   * @param {string} query - User's question
   * @param {number} topK - Number of results to return
   * @param {number} minScore - Minimum similarity threshold
   */
  async search(query, topK = 3, minScore = 0.05) {
    if (!this.isReady || this.documents.length === 0) {
      return [];
    }

    const queryEmbed = await this._embedText(query);
    const scoredDocs = [];

    for (const doc of this.documents) {
      let score = 0;
      if (queryEmbed.type === 'dense' && doc.vectorType === 'dense') {
        score = denseCosineSimilarity(queryEmbed.vector, doc.vector);
      } else {
        // Fallback sparse cosine
        const qVec = queryEmbed.type === 'sparse' ? queryEmbed.vector : (await this._embedText(query)).vector;
        const dVec = doc.vectorType === 'sparse' ? doc.vector : (await this._embedText(doc.text)).vector;
        score = sparseCosineSimilarity(qVec, dVec);
      }

      // Keyword boost: If exact match in keywords or title
      const queryLower = query.toLowerCase();
      if (doc.title.toLowerCase().includes(queryLower)) {
        score = Math.min(score + 0.25, 1.0);
      }
      if (doc.keywords && doc.keywords.some(k => queryLower.includes(k.toLowerCase()))) {
        score = Math.min(score + 0.15, 1.0);
      }

      if (score >= minScore) {
        scoredDocs.push({
          id: doc.id,
          category: doc.category,
          title: doc.title,
          content: doc.content,
          score: Math.round(score * 100) / 100,
        });
      }
    }

    // Sort descending by score and pick topK
    scoredDocs.sort((a, b) => b.score - a.score);
    return scoredDocs.slice(0, topK);
  }

  /**
   * Return statistics about the vector store
   */
  getStats() {
    return {
      totalItems: this.documents.length,
      embeddingMode: this.embeddingMode,
      vocabularySize: this.vocabulary.size,
      isReady: this.isReady,
    };
  }
}

// Singleton Vector Store Instance
export const vectorStore = new VectorStore();
