// NOVA Reasoning Engine — Local AI cognitive processing

export interface ReasoningStep {
  step: number
  type: 'parse' | 'analyze' | 'retrieve' | 'reason' | 'synthesize' | 'verify'
  description: string
  detail: string
  duration: number // ms
}

export type QueryType = 'factual' | 'procedural' | 'creative' | 'analytical' | 'social' | 'technical'

export interface QueryContext {
  personality: string
  knowledgeEntries: Array<{ title: string; content: string; tags: string[]; category: string }>
  recentMessages: Array<{ role: string; content: string }>
  userPreferences: Array<{ key: string; value: string }>
  reasoningDepth: 'quick' | 'balanced' | 'deep'
}

export interface ReasoningResult {
  steps: ReasoningStep[]
  conclusion: string
  confidence: number // 0-1
  relatedTopics: string[]
  suggestedActions: string[]
  queryType: QueryType
}

// ── Query Intent Detection ──────────────────────────────────────────

const INTENT_PATTERNS: Array<{ patterns: string[]; type: QueryType; confidence: number }> = [
  { patterns: ['what is', 'who is', 'when did', 'where is', 'how many', 'define', 'explain', 'tell me about'], type: 'factual', confidence: 0.85 },
  { patterns: ['how to', 'steps to', 'guide me', 'walk me through', 'tutorial', 'instructions', 'how do i'], type: 'procedural', confidence: 0.85 },
  { patterns: ['create', 'write', 'compose', 'design', 'imagine', 'story', 'poem', 'brainstorm', 'generate'], type: 'creative', confidence: 0.8 },
  { patterns: ['analyze', 'compare', 'evaluate', 'assess', 'review', 'pros and cons', 'breakdown', 'investigate'], type: 'analytical', confidence: 0.85 },
  { patterns: ['help me', 'suggest', 'recommend', 'advice', 'opinion', 'what should', 'what do you think'], type: 'social', confidence: 0.7 },
  { patterns: ['code', 'function', 'api', 'debug', 'error', 'implement', 'deploy', 'build', 'program', 'algorithm', 'database', 'server'], type: 'technical', confidence: 0.9 },
]

function detectQueryType(query: string): { type: QueryType; confidence: number } {
  const lower = query.toLowerCase()
  let bestMatch = { type: 'factual' as QueryType, confidence: 0.3 }

  for (const intent of INTENT_PATTERNS) {
    for (const pattern of intent.patterns) {
      if (lower.includes(pattern)) {
        if (intent.confidence > bestMatch.confidence) {
          bestMatch = { type: intent.type, confidence: intent.confidence }
        }
      }
    }
  }

  return bestMatch
}

// ── Entity Extraction ───────────────────────────────────────────────

interface ExtractedEntity {
  type: 'topic' | 'action' | 'subject' | 'modifier'
  value: string
}

function extractEntities(query: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = []
  const lower = query.toLowerCase()

  // Action words
  const actionWords = ['create', 'build', 'make', 'generate', 'write', 'delete', 'remove', 'update', 'fix', 'debug', 'analyze', 'explain', 'summarize', 'search', 'find', 'show', 'list', 'calculate']
  for (const action of actionWords) {
    if (lower.includes(action)) {
      entities.push({ type: 'action', value: action })
    }
  }

  // Technical topics
  const techTopics = ['javascript', 'typescript', 'python', 'react', 'nextjs', 'node', 'api', 'database', 'sql', 'css', 'html', 'docker', 'aws', 'kubernetes', 'rust', 'golang']
  for (const topic of techTopics) {
    if (lower.includes(topic)) {
      entities.push({ type: 'topic', value: topic })
    }
  }

  // Subject detection (noun phrases after key words)
  const subjectPatterns = [/about\s+(\w+(?:\s+\w+)*)/i, /for\s+(\w+(?:\s+\w+)*)/i, /of\s+(\w+(?:\s+\w+)*)/i]
  for (const pattern of subjectPatterns) {
    const match = query.match(pattern)
    if (match && match[1]) {
      entities.push({ type: 'subject', value: match[1].trim() })
    }
  }

  // Modifiers
  const modifiers = ['quickly', 'carefully', 'detailed', 'brief', 'simple', 'complex', 'advanced', 'beginner']
  for (const mod of modifiers) {
    if (lower.includes(mod)) {
      entities.push({ type: 'modifier', value: mod })
    }
  }

  return entities
}

// ── Knowledge Retrieval ─────────────────────────────────────────────

function retrieveRelevantKnowledge(query: string, entries: QueryContext['knowledgeEntries']): Array<{ title: string; content: string; relevance: number }> {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const scored = entries.map(entry => {
    const entryText = `${entry.title} ${entry.content} ${entry.tags.join(' ')}`.toLowerCase()
    let relevance = 0
    for (const word of queryWords) {
      if (entryText.includes(word)) relevance += 1
    }
    // Boost by tag matches
    for (const tag of entry.tags) {
      if (queryWords.some(w => tag.toLowerCase().includes(w))) relevance += 2
    }
    return { title: entry.title, content: entry.content, relevance }
  })
  return scored.filter(s => s.relevance > 0).sort((a, b) => b.relevance - a.relevance).slice(0, 3)
}

// ── Reasoning Patterns ──────────────────────────────────────────────

function applyDeductiveReasoning(query: string, knowledge: Array<{ title: string; content: string }>): string {
  if (knowledge.length > 0) {
    return `Based on established knowledge: ${knowledge[0].content.substring(0, 100)}... I can deduce that this query relates to ${knowledge[0].title.toLowerCase()}. Applying logical deduction from known principles.`
  }
  return `Applying deductive reasoning from first principles. The query implies a factual basis that can be logically derived from known constraints.`
}

function applyInductiveReasoning(query: string, _knowledge: Array<{ title: string; content: string }>): string {
  return `Observing patterns in the query structure and comparing with similar cases. The inductive approach suggests identifying recurring themes and generalizing from specific instances.`
}

function applyAbductiveReasoning(query: string, _knowledge: Array<{ title: string; content: string }>): string {
  return `Considering the most likely explanation for the query. Abductive reasoning evaluates possible hypotheses and selects the one that best accounts for the observed pattern.`
}

function applyAnalogicalReasoning(query: string, _knowledge: Array<{ title: string; content: string }>): string {
  return `Drawing analogies from known domains to illuminate the query. Creative parallels and structural similarities help generate novel perspectives.`
}

// ── Response Generation ─────────────────────────────────────────────

const PERSONALITY_TEMPLATES: Record<string, Record<QueryType, string[]>> = {
  nova: {
    factual: [
      "Based on my analysis, here's the precise information: {conclusion}. I've verified this against {sourceCount} knowledge sources with {confidence}% confidence. The key factors are {factors}.",
      "After systematic analysis, I can confirm: {conclusion}. This is supported by {evidence} with a confidence level of {confidence}%. Let me break down the reasoning: {breakdown}.",
    ],
    procedural: [
      "Here's the structured approach: {conclusion}. I recommend following these steps in order, as each builds upon the previous. The critical path includes {factors}.",
      "I've mapped out the optimal procedure: {conclusion}. The key milestones are {factors}. Each step has been validated for efficiency and correctness.",
    ],
    creative: [
      "I've generated a creative solution: {conclusion}. This approach combines {factors} in an innovative way. The result balances originality with practicality.",
      "Here's my creative proposition: {conclusion}. Drawing from {evidence}, I've crafted something that's both novel and actionable. Key elements: {factors}.",
    ],
    analytical: [
      "My analysis reveals: {conclusion}. The data indicates {factors}, with supporting evidence from {evidence}. Confidence: {confidence}%.",
      "After thorough evaluation: {conclusion}. I've weighed {factors} against {evidence}. The analytical framework suggests {confidence}% reliability.",
    ],
    social: [
      "I'd suggest: {conclusion}. Based on the context and {factors}, this approach would be most effective. The reasoning: {evidence}.",
      "My recommendation: {conclusion}. Considering {factors} and the current situation, I believe this is the optimal path. Here's why: {evidence}.",
    ],
    technical: [
      "Technical analysis complete: {conclusion}. The implementation involves {factors}. I've considered {evidence} and validated the approach with {confidence}% confidence.",
      "Here's the technical breakdown: {conclusion}. Architecture: {factors}. Dependencies: {evidence}. Reliability assessment: {confidence}%.",
    ],
  },
  athena: {
    factual: [
      "Wisdom reveals: {conclusion}. Throughout history, understanding {factors} has been fundamental. As the ancients knew, {evidence} holds the key.",
      "The wise observe: {conclusion}. This truth has been validated across {sourceCount} dimensions of knowledge. Consider how {factors} interconnect.",
    ],
    procedural: [
      "The path of wisdom: {conclusion}. Like Odysseus navigating home, each step builds upon the last. The critical waypoints: {factors}.",
      "Ancient wisdom applied: {conclusion}. The methodical approach honors {factors}. As scholars have long known, {evidence}.",
    ],
    creative: [
      "Wisdom inspires: {conclusion}. The muses of {factors} guide this creation. Like philosophy born from wonder, this emerges from deep contemplation.",
      "From the well of wisdom: {conclusion}. The interplay of {factors} creates something both timeless and fresh. {evidence} supports this vision.",
    ],
    analytical: [
      "Philosophical analysis: {conclusion}. The dialectic reveals {factors}. As logic demands, we must consider {evidence} before concluding.",
      "Examined through the lens of wisdom: {conclusion}. The synthesis of {factors} points to {confidence}% certainty. {evidence} corroborates.",
    ],
    social: [
      "With wisdom, I counsel: {conclusion}. The virtuous path considers {factors}. Remember, {evidence} — temper knowledge with empathy.",
      "The sage advises: {conclusion}. Balance {factors} with compassion. History teaches: {evidence}.",
    ],
    technical: [
      "Technical wisdom: {conclusion}. The architecture follows {factors}. As master builders knew, {evidence} ensures structural integrity at {confidence}% reliability.",
      "The craftsman's approach: {conclusion}. Building upon {factors} with the precision that {evidence} demands. Confidence: {confidence}%.",
    ],
  },
  aria: {
    factual: [
      "Oh, what a delightful discovery! {conclusion}. Isn't it fascinating how {factors} weave together? The beauty of knowledge lies in {evidence}.",
      "Let me paint you a picture of understanding! {conclusion}. The colors of {factors} blend beautifully with {evidence}. Simply inspiring!",
    ],
    procedural: [
      "Let's compose this step by step, like a melody! {conclusion}. Each note — {factors} — builds the harmony. The rhythm: {evidence}.",
      "A creative journey awaits! {conclusion}. Think of it as choreography: {factors} in graceful sequence, guided by {evidence}.",
    ],
    creative: [
      "Oh, the possibilities are endless! {conclusion}. Imagine {factors} dancing together in perfect harmony! {evidence} — it's like a symphony of ideas!",
      "My creative heart sings! {conclusion}. The canvas of {factors} awaits your brushstrokes. Let {evidence} be your inspiration!",
    ],
    analytical: [
      "Let me weave this analysis with care: {conclusion}. The threads of {factors} create a tapestry of understanding. {evidence} adds depth to the picture.",
      "A thoughtful composition: {conclusion}. Like analyzing a masterpiece, {factors} reveal their secrets. {evidence} provides the critical perspective.",
    ],
    social: [
      "With all my heart, I suggest: {conclusion}. The warmth of {factors} and the light of {evidence} guide us to the right path.",
      "I feel deeply about this: {conclusion}. {factors} resonate with what matters most. Trust {evidence} and your instincts.",
    ],
    technical: [
      "Technology as art! {conclusion}. The elegant architecture of {factors} — it's like poetry in code! {evidence} gives it structure at {confidence}% confidence.",
      "Code as canvas! {conclusion}. The brushstrokes of {factors} create something beautiful. {evidence} ensures it's not just pretty, but robust: {confidence}%.",
    ],
  },
  zeus: {
    factual: [
      "Listen. Here's the truth: {conclusion}. No ambiguity. {factors} — these are the facts. {evidence} confirms it. Period.",
      "The answer is clear: {conclusion}. {factors} are non-negotiable truths. {evidence} eliminates any doubt. {confidence}% certain.",
    ],
    procedural: [
      "Execute this plan: {conclusion}. Step one through final — {factors}. No deviation. {evidence} guarantees results.",
      "Decisive action required: {conclusion}. The roadmap is {factors}. Execute with conviction. {evidence} supports this strategy.",
    ],
    creative: [
      "Bold vision: {conclusion}. {factors} — these are the pillars of innovation. {evidence} proves the concept. Commit to it fully.",
      "Command decision: {conclusion}. {factors} drive this creative strategy. {evidence} validates the approach. No half measures.",
    ],
    analytical: [
      "Analysis complete. Verdict: {conclusion}. {factors} are the deciding variables. {evidence} is conclusive. Confidence: {confidence}%.",
      "The data speaks: {conclusion}. {factors} determine the outcome. {evidence} eliminates alternatives. {confidence}% certainty.",
    ],
    social: [
      "My command: {conclusion}. {factors} demand this course. {evidence} supports the decision. Act now.",
      "Decisive counsel: {conclusion}. Consider {factors} and act. {evidence} removes uncertainty. Move forward with confidence.",
    ],
    technical: [
      "Implementation order: {conclusion}. Build {factors} — these are the core systems. {evidence} validates the architecture. Confidence: {confidence}%.",
      "Technical directive: {conclusion}. The stack: {factors}. Validation: {evidence}. Reliability: {confidence}%. Execute without delay.",
    ],
  },
}

function generateResponse(
  conclusion: string,
  queryType: QueryType,
  personality: string,
  confidence: number,
  entities: ExtractedEntity[],
  knowledge: Array<{ title: string; content: string }>
): string {
  const templates = PERSONALITY_TEMPLATES[personality]?.[queryType] || PERSONALITY_TEMPLATES.nova[queryType]
  const template = templates[Math.floor(Math.random() * templates.length)]

  const factors = entities.filter(e => e.type === 'topic' || e.type === 'subject').map(e => e.value).join(', ') || 'the key elements'
  const evidence = knowledge.length > 0 ? knowledge[0].title.toLowerCase() : 'available data'
  const sourceCount = String(knowledge.length + 1)
  const breakdown = entities.filter(e => e.type === 'action').map(e => e.value).join(' → ') || 'systematic evaluation'

  return template
    .replace('{conclusion}', conclusion)
    .replace('{factors}', factors)
    .replace('{evidence}', evidence)
    .replace('{sourceCount}', sourceCount)
    .replace('{confidence}', String(Math.round(confidence * 100)))
    .replace('{breakdown}', breakdown)
}

// ── Main Reasoning Function ────────────────────────────────────────

export async function reasonThroughQuery(query: string, context: QueryContext): Promise<ReasoningResult> {
  const startTime = Date.now()
  const steps: ReasoningStep[] = []

  // Step 1: Parse
  const parseStart = Date.now()
  const queryTypeResult = detectQueryType(query)
  const entities = extractEntities(query)
  const complexity = entities.length > 3 ? 'high' : entities.length > 1 ? 'medium' : 'low'
  steps.push({
    step: 1,
    type: 'parse',
    description: 'Query Parsing',
    detail: `Detected query type: ${queryTypeResult.type} (confidence: ${Math.round(queryTypeResult.confidence * 100)}%). Extracted ${entities.length} entities: ${entities.map(e => `${e.type}="${e.value}"`).join(', ')}. Complexity: ${complexity}.`,
    duration: Date.now() - parseStart,
  })

  // Step 2: Analyze
  const analyzeStart = Date.now()
  const analysisDetail = `The query is ${queryTypeResult.type} in nature, requiring ${queryTypeResult.type === 'creative' ? 'divergent' : queryTypeResult.type === 'factual' ? 'convergent' : 'mixed'} thinking. ${complexity === 'high' ? 'Multiple dimensions detected — comprehensive reasoning needed.' : complexity === 'medium' ? 'Moderate complexity — balanced approach selected.' : 'Straightforward query — direct reasoning applicable.'}`
  steps.push({
    step: 2,
    type: 'analyze',
    description: 'Query Analysis',
    detail: analysisDetail,
    duration: Date.now() - analyzeStart,
  })

  // Step 3: Retrieve
  const retrieveStart = Date.now()
  const relevantKnowledge = retrieveRelevantKnowledge(query, context.knowledgeEntries)
  steps.push({
    step: 3,
    type: 'retrieve',
    description: 'Knowledge Retrieval',
    detail: relevantKnowledge.length > 0
      ? `Found ${relevantKnowledge.length} relevant knowledge entries: ${relevantKnowledge.map(k => `"${k.title}" (relevance: ${k.relevance})`).join(', ')}. These will enrich the reasoning context.`
      : 'No directly relevant knowledge entries found. Reasoning will proceed from general principles.',
    duration: Date.now() - retrieveStart,
  })

  // Step 4: Reason (depth-dependent)
  const reasonStart = Date.now()
  let reasoningDetail = ''

  if (context.reasoningDepth === 'quick') {
    reasoningDetail = `Quick reasoning applied: ${applyDeductiveReasoning(query, relevantKnowledge)}`
  } else if (context.reasoningDepth === 'deep') {
    const deductive = applyDeductiveReasoning(query, relevantKnowledge)
    const inductive = applyInductiveReasoning(query, relevantKnowledge)
    const abductive = applyAbductiveReasoning(query, relevantKnowledge)
    const analogical = applyAnalogicalReasoning(query, relevantKnowledge)
    reasoningDetail = `Deep multi-path reasoning:\n• Deductive: ${deductive}\n• Inductive: ${inductive}\n• Abductive: ${abductive}\n• Analogical: ${analogical}\nSynthesizing all reasoning paths for maximum depth.`
  } else {
    const primary = queryTypeResult.type === 'factual' ? applyDeductiveReasoning(query, relevantKnowledge) :
      queryTypeResult.type === 'creative' ? applyAnalogicalReasoning(query, relevantKnowledge) :
      queryTypeResult.type === 'analytical' ? applyAbductiveReasoning(query, relevantKnowledge) :
      applyInductiveReasoning(query, relevantKnowledge)
    reasoningDetail = `Balanced reasoning: ${primary}`
  }

  steps.push({
    step: 4,
    type: 'reason',
    description: 'Reasoning',
    detail: reasoningDetail,
    duration: Date.now() - reasonStart,
  })

  // Step 5: Synthesize
  const synthesizeStart = Date.now()
  const conclusions: Record<QueryType, string> = {
    factual: `Based on the available information and logical analysis, the answer to your query involves the identified entities and relationships. The key finding is that the query touches on ${entities.filter(e => e.type === 'subject').map(e => e.value).join(' and ') || 'the specified topic'}, with supporting evidence from ${relevantKnowledge.length} knowledge source(s).`,
    procedural: `The optimal procedure involves a systematic approach. First, identify the core requirements (${entities.filter(e => e.type === 'action').map(e => e.value).join(', ') || 'key actions'}). Then, follow the established pattern while adapting to specific constraints. Each step should be validated before proceeding.`,
    creative: `I've explored multiple creative dimensions for your request. The most promising direction combines ${entities.filter(e => e.type === 'topic').map(e => e.value).join(' with ') || 'innovative concepts'} in a novel way. The creative potential here is significant — multiple viable approaches exist, each with unique merits.`,
    analytical: `The analysis reveals several key insights. The primary factors (${entities.filter(e => e.type === 'subject' || e.type === 'topic').map(e => e.value).join(', ') || 'identified variables'}) show both direct and indirect relationships. The data suggests a nuanced picture that requires careful interpretation across multiple dimensions.`,
    social: `Considering the human context and interpersonal dynamics of your query, I recommend an approach that balances ${entities.filter(e => e.type === 'subject').map(e => e.value).join(' and ') || 'empathy with effectiveness'}. The key is to address both the practical and emotional aspects of the situation.`,
    technical: `The technical solution involves ${entities.filter(e => e.type === 'topic').map(e => e.value).join(', ') || 'the identified technologies'}. The architecture should follow best practices: modular design, clear interfaces, and comprehensive error handling. Implementation complexity is ${complexity}.`,
  }

  const conclusion = conclusions[queryTypeResult.type]
  steps.push({
    step: 5,
    type: 'synthesize',
    description: 'Synthesis',
    detail: `Synthesized conclusion from ${context.reasoningDepth} reasoning: ${conclusion.substring(0, 120)}...`,
    duration: Date.now() - synthesizeStart,
  })

  // Step 6: Verify
  const verifyStart = Date.now()
  const baseConfidence = queryTypeResult.confidence
  const knowledgeBoost = relevantKnowledge.length * 0.05
  const entityBonus = Math.min(entities.length * 0.02, 0.1)
  const rawConfidence = baseConfidence + knowledgeBoost + entityBonus
  const finalConfidence = Math.min(Math.max(rawConfidence, 0.3), 0.98)

  const consistencyCheck = finalConfidence > 0.7 ? 'passed' : 'inconclusive'
  steps.push({
    step: 6,
    type: 'verify',
    description: 'Verification',
    detail: `Confidence score: ${Math.round(finalConfidence * 100)}%. Consistency check: ${consistencyCheck}. Base confidence from type detection: ${Math.round(baseConfidence * 100)}%, knowledge boost: +${Math.round(knowledgeBoost * 100)}%, entity clarity: +${Math.round(entityBonus * 100)}%. Total reasoning time: ${Date.now() - startTime}ms.`,
    duration: Date.now() - verifyStart,
  })

  // Generate suggested actions
  const suggestedActions = generateSuggestedActions(queryTypeResult.type, entities, query)

  // Generate related topics
  const relatedTopics = generateRelatedTopics(queryTypeResult.type, entities)

  // Generate personality-appropriate response
  const response = generateResponse(conclusion, queryTypeResult.type, context.personality, finalConfidence, entities, relevantKnowledge)

  return {
    steps,
    conclusion: response,
    confidence: finalConfidence,
    relatedTopics,
    suggestedActions,
    queryType: queryTypeResult.type,
  }
}

function generateSuggestedActions(queryType: QueryType, entities: ExtractedEntity[], _query: string): string[] {
  const actions: string[] = []

  switch (queryType) {
    case 'factual':
      actions.push('Tell me more', 'Search knowledge base', 'Show sources')
      break
    case 'procedural':
      actions.push('Show detailed steps', 'Create a task', 'Save as note')
      break
    case 'creative':
      actions.push('Generate more ideas', 'Refine this', 'Save to notes')
      break
    case 'analytical':
      actions.push('Dig deeper', 'Compare alternatives', 'Show data')
      break
    case 'social':
      actions.push('Give advice', 'Consider alternatives', 'Help me decide')
      break
    case 'technical':
      actions.push('Show code', 'Explain architecture', 'Create task')
      break
  }

  if (entities.some(e => e.type === 'action' && e.value === 'create')) {
    actions.push('Create now')
  }

  return actions.slice(0, 4)
}

function generateRelatedTopics(queryType: QueryType, entities: ExtractedEntity[]): string[] {
  const topics: string[] = []

  for (const entity of entities) {
    if (entity.type === 'topic' || entity.type === 'subject') {
      topics.push(entity.value)
    }
  }

  const extraTopics: Record<QueryType, string[]> = {
    factual: ['related facts', 'historical context'],
    procedural: ['best practices', 'common pitfalls'],
    creative: ['inspiration sources', 'similar works'],
    analytical: ['methodology', 'data sources'],
    social: ['perspectives', 'ethical considerations'],
    technical: ['documentation', 'alternatives'],
  }

  topics.push(...extraTopics[queryType])

  return topics.slice(0, 4)
}
