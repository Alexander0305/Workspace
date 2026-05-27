// Knowledge Engine - TF-IDF search + RAG for NOVA
// Provides full-text search, RAG context generation, tag suggestion,
// and document similarity for the knowledge base.

export interface KnowledgeDocument {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface SearchResult {
  document: KnowledgeDocument
  score: number
  matchedTerms: string[]
  snippet: string
}

// ── Tokenization ─────────────────────────────────────────────────────────────

/**
 * Tokenize text into lowercase words, stripping punctuation and keeping
 * only tokens longer than 2 characters.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

// ── Stop words ───────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her',
  'was', 'one', 'our', 'out', 'has', 'have', 'been', 'from', 'this', 'that',
  'with', 'they', 'will', 'what', 'when', 'make', 'like', 'just', 'over',
  'such', 'take', 'than', 'them', 'very', 'also', 'into', 'about', 'would',
  'could', 'should', 'other', 'which', 'their', 'there', 'these', 'those',
  'some', 'more', 'then', 'each', 'where', 'does', 'only', 'most', 'being',
  'any', 'many', 'much', 'how', 'who', 'did', 'get', 'its', 'may', 'after',
  'before', 'between', 'through', 'during', 'without', 'because', 'under',
  'while', 'both', 'same', 'another', 'must', 'here', 'own', 'too', 'down',
])

function isStopWord(word: string): boolean {
  return STOP_WORDS.has(word)
}

// ── TF-IDF computation ───────────────────────────────────────────────────────

/**
 * Calculate Term Frequency (TF) for a list of tokens.
 * Returns a map of term → normalised frequency (0–1).
 */
function calculateTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  const filtered = tokens.filter((t) => !isStopWord(t))
  for (const token of filtered) {
    tf.set(token, (tf.get(token) || 0) + 1)
  }
  // Normalize by document length so longer documents don't dominate
  const len = filtered.length || 1
  for (const [key, val] of tf) {
    tf.set(key, val / len)
  }
  return tf
}

/**
 * Calculate Inverse Document Frequency (IDF) across all documents.
 * Uses smoothed IDF: log((N + 1) / (df + 1)) + 1  (so that terms
 * appearing in every document still have a positive weight).
 */
function calculateIDF(documents: string[][]): Map<string, number> {
  const idf = new Map<string, number>()
  const totalDocs = documents.length || 1

  // Count how many documents contain each term
  const docFreq = new Map<string, number>()
  for (const docTokens of documents) {
    const uniqueTokens = new Set(docTokens.filter((t) => !isStopWord(t)))
    for (const token of uniqueTokens) {
      docFreq.set(token, (docFreq.get(token) || 0) + 1)
    }
  }

  // Calculate IDF
  for (const [term, freq] of docFreq) {
    idf.set(term, Math.log((totalDocs + 1) / (freq + 1)) + 1)
  }

  return idf
}

/**
 * Compute a TF-IDF similarity score between a set of query tokens and a
 * document whose TF has already been computed.
 */
function tfidfScore(
  queryTokens: string[],
  docTF: Map<string, number>,
  idf: Map<string, number>,
): number {
  let score = 0
  for (const token of queryTokens) {
    const tf = docTF.get(token) || 0
    const idfVal = idf.get(token) || 1
    score += tf * idfVal
  }
  return score
}

// ── Snippet extraction ───────────────────────────────────────────────────────

/**
 * Find the best snippet from content matching the query terms.
 * Uses a sliding-window approach that counts term hits at each character
 * position, then extracts a window of `contextChars` characters around the
 * densest region.
 */
function findSnippet(
  content: string,
  queryTerms: string[],
  contextChars: number = 120,
): string {
  if (queryTerms.length === 0) {
    return content.slice(0, contextChars) + (content.length > contextChars ? '...' : '')
  }

  const lower = content.toLowerCase()
  let bestPos = 0
  let bestMatches = 0

  // For longer documents, step by word boundaries instead of every character
  const step = content.length > 5000 ? 5 : 1

  for (let i = 0; i < content.length; i += step) {
    let matches = 0
    for (const term of queryTerms) {
      if (lower.substring(i, i + term.length) === term) {
        matches++
      }
    }
    if (matches > bestMatches) {
      bestMatches = matches
      bestPos = i
    }
  }

  // If no match found, start from the beginning
  if (bestMatches === 0) {
    bestPos = 0
  }

  const halfContext = Math.floor(contextChars / 2)
  const start = Math.max(0, bestPos - halfContext)
  const end = Math.min(content.length, bestPos + halfContext)

  let snippet = content.substring(start, end)

  // Add ellipsis indicators
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet += '...'

  return snippet
}

// ── Main search ──────────────────────────────────────────────────────────────

/**
 * Search the knowledge base using TF-IDF scoring with boosts for title and
 * tag matches.
 *
 * @param query       The free-text search query
 * @param documents   All knowledge documents to search across
 * @param maxResults  Maximum number of results to return (default 5)
 * @returns           An array of `SearchResult` sorted by relevance (best first)
 */
export function searchKnowledge(
  query: string,
  documents: KnowledgeDocument[],
  maxResults: number = 5,
): SearchResult[] {
  if (!query.trim() || documents.length === 0) return []

  const queryTokens = tokenize(query).filter((t) => !isStopWord(t))
  if (queryTokens.length === 0) return []

  // Build token lists for every document (title + content + tags)
  const docTokenLists = documents.map((doc) =>
    tokenize(`${doc.title} ${doc.content} ${doc.tags.join(' ')}`),
  )

  // Calculate IDF across the whole corpus
  const idf = calculateIDF(docTokenLists)

  // Score each document
  const results: SearchResult[] = documents.map((doc, i) => {
    const tf = calculateTF(docTokenLists[i])
    const baseScore = tfidfScore(queryTokens, tf, idf)

    // ── Title boost ──────────────────────────────────────────────────────
    const titleTokens = tokenize(doc.title)
    const titleMatchCount = queryTokens.filter((qt) => titleTokens.includes(qt)).length
    const titleBoost = titleMatchCount * 0.5

    // ── Tag boost ────────────────────────────────────────────────────────
    const tagText = doc.tags.join(' ').toLowerCase()
    const tagMatchCount = queryTokens.filter((qt) => tagText.includes(qt)).length
    const tagBoost = tagMatchCount * 0.3

    // ── Category boost (minor) ───────────────────────────────────────────
    const catLower = doc.category.toLowerCase()
    const catMatch = queryTokens.includes(catLower) ? 0.2 : 0

    const finalScore = baseScore + titleBoost + tagBoost + catMatch

    // ── Matched terms ────────────────────────────────────────────────────
    const matchedTerms = queryTokens.filter(
      (qt) => docTokenLists[i].includes(qt) || tagText.includes(qt) || doc.title.toLowerCase().includes(qt),
    )

    return {
      document: doc,
      score: finalScore,
      matchedTerms: [...new Set(matchedTerms)], // deduplicate
      snippet: findSnippet(doc.content, queryTokens),
    }
  })

  // Filter out zero-score results, sort by score descending, limit
  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
}

// ── RAG context generation ───────────────────────────────────────────────────

/**
 * Generate a RAG (Retrieval-Augmented Generation) context string from
 * search results.  The context is a concatenation of the most relevant
 * documents, truncated to `maxLength` characters.
 */
export function generateRAGContext(
  results: SearchResult[],
  maxLength: number = 2000,
): string {
  let context = ''
  for (const result of results) {
    const entry = `[${result.document.category}] ${result.document.title}: ${result.document.content}\n`
    if (context.length + entry.length > maxLength) {
      // Add as much of this entry as fits
      const remaining = maxLength - context.length
      if (remaining > 20) {
        context += entry.slice(0, remaining - 1) + '…\n'
      }
      break
    }
    context += entry
  }
  return context.trim()
}

/**
 * Build a RAG-ready prompt prefix that can be prepended to a user message
 * before sending it to the LLM.
 */
export function buildRAGPrompt(
  results: SearchResult[],
  maxLength: number = 2000,
): string {
  const context = generateRAGContext(results, maxLength)
  if (!context) return ''
  return `The following knowledge base entries may be relevant to the user's question:\n\n${context}\n\nUse this information when answering, but prefer the user's explicit question over the context if they conflict.\n\n`
}

// ── Tag suggestion ───────────────────────────────────────────────────────────

/**
 * Suggest tags based on document content by finding the most frequent
 * non-stop-word terms.
 */
export function suggestTags(
  content: string,
  existingTags: string[] = [],
  maxTags: number = 5,
): string[] {
  const tokens = tokenize(content).filter((t) => !isStopWord(t))
  const freq = new Map<string, number>()
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1)
  }
  // Sort by frequency descending, take top N, exclude existing tags
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTags * 2) // over-select before filtering
    .map(([word]) => word)
    .filter((word) => !existingTags.includes(word))
    .slice(0, maxTags)
}

// ── Document similarity ──────────────────────────────────────────────────────

/**
 * Calculate Jaccard similarity between two documents based on their
 * token sets.  Returns a value between 0 (no overlap) and 1 (identical
 * token sets).
 */
export function documentSimilarity(
  doc1: KnowledgeDocument,
  doc2: KnowledgeDocument,
): number {
  const tokens1 = new Set(
    tokenize(`${doc1.title} ${doc1.content}`).filter((t) => !isStopWord(t)),
  )
  const tokens2 = new Set(
    tokenize(`${doc2.title} ${doc2.content}`).filter((t) => !isStopWord(t)),
  )

  const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)))
  const union = new Set([...tokens1, ...tokens2])

  return union.size === 0 ? 0 : intersection.size / union.size
}

// ── Knowledge extraction from text ───────────────────────────────────────────

/**
 * Extract potential knowledge entries from a chat message or text blob.
 * Uses simple heuristics to identify factual statements, definitions,
 * and key-value pairs.
 */
export interface ExtractedFact {
  text: string
  confidence: number // 0–1
  type: 'definition' | 'fact' | 'preference' | 'instruction'
}

export function extractFacts(text: string): ExtractedFact[] {
  const facts: ExtractedFact[] = []
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase()

    // Definition pattern: "X is Y" / "X means Y"
    if (/\b(is|means|refers to|stands for|defined as)\b/.test(lower)) {
      facts.push({ text: sentence, confidence: 0.8, type: 'definition' })
      continue
    }

    // Preference pattern: "I like/prefer/want/love X"
    if (/\b(i like|i prefer|i want|i love|i enjoy|i hate|i dislike)\b/.test(lower)) {
      facts.push({ text: sentence, confidence: 0.9, type: 'preference' })
      continue
    }

    // Instruction pattern: "always/never/remember to/make sure"
    if (/\b(always|never|remember to|make sure|don't forget|should|must)\b/.test(lower)) {
      facts.push({ text: sentence, confidence: 0.7, type: 'instruction' })
      continue
    }

    // General factual statement (lower confidence)
    if (sentence.length > 20 && /\b(is|are|was|were|has|have|can|will)\b/.test(lower)) {
      facts.push({ text: sentence, confidence: 0.5, type: 'fact' })
    }
  }

  return facts
}

// ── Knowledge base statistics ────────────────────────────────────────────────

export interface KnowledgeStats {
  totalDocuments: number
  totalTokens: number
  uniqueTerms: number
  categoryBreakdown: Record<string, number>
  avgDocumentLength: number
  topTerms: Array<{ term: string; frequency: number }>
}

/**
 * Compute aggregate statistics over the knowledge base.
 */
export function computeKnowledgeStats(documents: KnowledgeDocument[]): KnowledgeStats {
  if (documents.length === 0) {
    return {
      totalDocuments: 0,
      totalTokens: 0,
      uniqueTerms: 0,
      categoryBreakdown: {},
      avgDocumentLength: 0,
      topTerms: [],
    }
  }

  const categoryBreakdown: Record<string, number> = {}
  const globalFreq = new Map<string, number>()
  let totalTokens = 0

  for (const doc of documents) {
    categoryBreakdown[doc.category] = (categoryBreakdown[doc.category] || 0) + 1

    const tokens = tokenize(`${doc.title} ${doc.content}`).filter((t) => !isStopWord(t))
    totalTokens += tokens.length

    for (const token of tokens) {
      globalFreq.set(token, (globalFreq.get(token) || 0) + 1)
    }
  }

  const topTerms = Array.from(globalFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([term, frequency]) => ({ term, frequency }))

  return {
    totalDocuments: documents.length,
    totalTokens,
    uniqueTerms: globalFreq.size,
    categoryBreakdown,
    avgDocumentLength: Math.round(totalTokens / documents.length),
    topTerms,
  }
}
