/**
 * ============================================================
 * SkillSwap RAG Engine — Retrieval Augmented Generation
 * ============================================================
 * 
 * A lightweight, from-scratch RAG implementation using:
 *   1. Text Chunking (overlapping sliding window)
 *   2. TF-IDF Vectorization (Term Frequency - Inverse Document Frequency)
 *   3. Cosine Similarity Search (for relevance ranking)
 *   4. Top-K Retrieval (selecting the most relevant context)
 * 
 * Interview Talking Points:
 * - No external vector DB (Pinecone/Weaviate) needed — pure algorithmic approach
 * - TF-IDF captures term importance relative to the corpus
 * - Cosine similarity measures angular distance between document vectors
 * - Overlapping chunks ensure context isn't lost at boundaries
 */

// ──────────────────────────────────────────────
// 1. TEXT CHUNKING
// ──────────────────────────────────────────────

/**
 * Split a large text into overlapping chunks for granular retrieval.
 * 
 * Why overlapping? If a relevant sentence spans two chunks,
 * the overlap ensures it appears in at least one chunk fully.
 * 
 * @param {string} text - The full document text
 * @param {number} chunkSize - Maximum characters per chunk (default 500)
 * @param {number} overlap - Characters of overlap between chunks (default 100)
 * @returns {string[]} Array of text chunks
 */
export function chunkText(text, chunkSize = 500, overlap = 100) {
  if (!text || text.length === 0) return [];
  
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Try to break at a sentence boundary (., !, ?, \n) for cleaner chunks
    if (end < text.length) {
      const slice = text.slice(start, end); 
      const lastBreak = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('.\n'),
        slice.lastIndexOf('! '),
        slice.lastIndexOf('? '),
        slice.lastIndexOf('\n\n')
      );
      if (lastBreak > chunkSize * 0.3) {
        end = start + lastBreak + 1;
      }
    }

    const chunk = text.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move forward by (chunkSize - overlap) to create overlap
    start = end - overlap;
    if (start >= text.length) break;
    // Prevent infinite loop on very small texts
    if (end === text.length) break;
  }

  return chunks;
}


// ──────────────────────────────────────────────
// 2. TEXT PREPROCESSING
// ──────────────────────────────────────────────

/**
 * Tokenize and normalize text for TF-IDF computation.
 * - Lowercases everything
 * - Removes punctuation
 * - Splits on whitespace
 * - Filters out stopwords and very short tokens
 */
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'and', 'but', 'or', 'if', 'while', 'because', 'until', 'that', 'which',
  'who', 'whom', 'this', 'these', 'those', 'it', 'its', 'i', 'me', 'my',
  'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they',
  'them', 'their', 'what', 'am', 'about', 'up'
]);

export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s\-\.]/g, ' ')   // keep alphanumeric, hyphens, dots
    .split(/\s+/)
    .filter(token => token.length > 1 && !STOPWORDS.has(token));
}


// ──────────────────────────────────────────────
// 3. TF-IDF VECTORIZATION
// ──────────────────────────────────────────────

/**
 * Build a TF-IDF model from a corpus of document chunks.
 * 
 * TF (Term Frequency)  = count(term in doc) / total_terms_in_doc
 * IDF (Inverse Doc Freq) = log(total_docs / docs_containing_term)
 * TF-IDF = TF * IDF
 * 
 * High TF-IDF → term is important in this specific document
 * Low TF-IDF  → term is common across all documents (less useful)
 */
export class TfIdfModel {
  constructor() {
    this.documents = [];       // tokenized docs
    this.vocabulary = new Set();
    this.idf = {};             // term → IDF score
    this.tfidfVectors = [];    // per-document TF-IDF vectors
  }

  /**
   * Fit the model on a corpus of text chunks.
   * @param {string[]} chunks - Array of raw text chunks
   */
  fit(chunks) {
    // Step 1: Tokenize all documents
    this.documents = chunks.map(chunk => tokenize(chunk));
    const numDocs = this.documents.length;

    // Step 2: Build vocabulary and document frequency (DF)
    const df = {};  // term → number of documents containing it
    for (const doc of this.documents) {
      const uniqueTerms = new Set(doc);
      for (const term of uniqueTerms) {
        this.vocabulary.add(term);
        df[term] = (df[term] || 0) + 1;
      }
    }

    // Step 3: Compute IDF for each term
    //   IDF = log(N / df(term)) + 1   (smoothed to avoid division by zero)
    for (const term of this.vocabulary) {
      this.idf[term] = Math.log(numDocs / (df[term] || 1)) + 1;
    }

    // Step 4: Compute TF-IDF vector for each document
    this.tfidfVectors = this.documents.map(doc => this._computeTfIdf(doc));
  }

  /**
   * Compute TF-IDF vector for a single tokenized document.
   * @param {string[]} tokens 
   * @returns {Object} term → TF-IDF score
   */
  _computeTfIdf(tokens) {
    const tf = {};
    for (const token of tokens) {
      tf[token] = (tf[token] || 0) + 1;
    }

    const vector = {};
    const totalTerms = tokens.length || 1;
    for (const term in tf) {
      const termFreq = tf[term] / totalTerms;
      vector[term] = termFreq * (this.idf[term] || 1);
    }
    return vector;
  }

  /**
   * Transform a query string into a TF-IDF vector using the fitted model.
   * @param {string} query 
   * @returns {Object} term → TF-IDF score
   */
  transformQuery(query) {
    const tokens = tokenize(query);
    return this._computeTfIdf(tokens);
  }
}


// ──────────────────────────────────────────────
// 4. COSINE SIMILARITY
// ──────────────────────────────────────────────

/**
 * Compute cosine similarity between two sparse vectors (represented as objects).
 * 
 * cosine(A, B) = (A · B) / (||A|| * ||B||)
 * 
 * Range: 0 (completely different) to 1 (identical direction)
 * 
 * @param {Object} vecA - Sparse vector {term: weight}
 * @param {Object} vecB - Sparse vector {term: weight}
 * @returns {number} Similarity score between 0 and 1
 */
export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  // Dot product (only for terms present in both vectors)
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
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}


// ──────────────────────────────────────────────
// 5. RAG RETRIEVER — Putting It All Together
// ──────────────────────────────────────────────

/**
 * The main RAG retriever class.
 * 
 * Usage:
 *   const retriever = new RAGRetriever();
 *   retriever.addDocuments(["chunk1", "chunk2", ...]);
 *   const results = retriever.retrieve("user question", 3);
 *   // results = [{ chunk: "...", score: 0.87 }, ...]
 */
export class RAGRetriever {
  constructor() {
    this.chunks = [];
    this.model = new TfIdfModel();
    this.isReady = false;
  }

  /**
   * Add raw text documents. Each will be chunked, then the TF-IDF model is rebuilt.
   * @param {string[]} texts - Array of full document texts
   * @param {number} chunkSize 
   * @param {number} overlap 
   */
  addDocuments(texts, chunkSize = 500, overlap = 100) {
    for (const text of texts) {
      const newChunks = chunkText(text, chunkSize, overlap);
      this.chunks.push(...newChunks);
    }

    // Rebuild the TF-IDF model with all chunks
    this.model.fit(this.chunks);
    this.isReady = this.chunks.length > 0;

    console.log(`📚 RAG Retriever: Indexed ${this.chunks.length} chunks from ${texts.length} document(s)`);
  }

  /**
   * Add pre-chunked text directly (no further splitting).
   * @param {string[]} chunks 
   */
  addChunks(chunks) {
    this.chunks.push(...chunks);
    this.model.fit(this.chunks);
    this.isReady = this.chunks.length > 0;
  }

  /**
   * Retrieve the top-K most relevant chunks for a given query.
   * 
   * @param {string} query - The user's question
   * @param {number} topK - Number of chunks to return (default 3)
   * @param {number} minScore - Minimum similarity score threshold (default 0.05)
   * @returns {{ chunk: string, score: number, index: number }[]}
   */
  retrieve(query, topK = 3, minScore = 0.05) {
    if (!this.isReady) {
      return [];
    }

    const queryVector = this.model.transformQuery(query);

    // Score each chunk
    const scored = this.model.tfidfVectors.map((docVector, index) => ({
      chunk: this.chunks[index],
      score: cosineSimilarity(queryVector, docVector),
      index,
    }));

    // Sort by score descending and take top-K above the threshold
    return scored
      .filter(item => item.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /**
   * Get stats about the knowledge base.
   */
  getStats() {
    return {
      totalChunks: this.chunks.length,
      vocabularySize: this.model.vocabulary.size,
      isReady: this.isReady,
    };
  }
}
