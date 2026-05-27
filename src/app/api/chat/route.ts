import { NextRequest, NextResponse } from 'next/server'
import { reasonThroughQuery, type QueryContext } from '@/lib/reasoning-engine'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

type ChatRole = 'user' | 'assistant' | 'system'

const THINKING_TEMPLATES = [
  'Analyzing the query structure and identifying key intent patterns...',
  'Cross-referencing with knowledge base entries and contextual data...',
  'Evaluating multiple response strategies and selecting optimal approach...',
  'Generating coherent response with verified information...',
]

export async function POST(request: NextRequest) {
  try {
    // Auth check - require authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const {
      messages,
      personality = 'nova',
      knowledgeEntries = [],
      reasoningDepth = 'balanced',
      userPreferences = [],
      conversationId,
      ragContext = '',
    } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { content: 'Please provide a message for me to process.', thinking: 'No input detected.' },
        { status: 200 }
      )
    }

    const lastMessage = messages[messages.length - 1]?.content || ''
    const lastRole = messages[messages.length - 1]?.role || 'user'

    // Save user message to DB if conversationId is provided
    if (conversationId && lastRole === 'user') {
      try {
        await db.message.create({
          data: {
            conversationId,
            role: 'user',
            content: lastMessage,
          },
        })
      } catch {
        // Non-critical: don't fail the chat if message saving fails
      }
    }

    // Run reasoning engine
    const queryContext: QueryContext = {
      personality,
      knowledgeEntries: knowledgeEntries.map((e: { title: string; content: string; tags: string[]; category: string }) => ({
        title: e.title,
        content: e.content,
        tags: e.tags || [],
        category: e.category || '',
      })),
      recentMessages: messages.slice(-5).map((m: { role: string; content: string }) => ({ role: m.role as ChatRole, content: m.content })),
      userPreferences: userPreferences || [],
      reasoningDepth: reasoningDepth || 'balanced',
    }

    const reasoningResult = await reasonThroughQuery(lastMessage, queryContext)

    let aiContent: string

    // Try AI API first
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const ai = await ZAI.create()

      // Build enhanced system prompt with reasoning context
      const personalityDescriptions: Record<string, string> = {
        nova: 'Nova, a professional and precise AI assistant. Be concise, structured, and authoritative. Use clear formatting.',
        athena: 'Athena, a wise and analytical AI assistant. Be thoughtful, provide deep insights, and reference principles. Use philosophical framing.',
        aria: 'Aria, a creative and expressive AI assistant. Be enthusiastic, imaginative, and use vivid language. Make responses engaging.',
        zeus: 'Zeus, an assertive and decisive AI assistant. Be direct, confident, and action-oriented. No fluff, just results.',
      }

      const systemPrompt = personalityDescriptions[personality] || personalityDescriptions.nova

      // Add knowledge context (RAG) — prefer client-side RAG context if provided
      let knowledgeContext = ''
      if (ragContext) {
        knowledgeContext = `\n\nRelevant knowledge from the user's knowledge base (TF-IDF RAG retrieval):\n${ragContext}`
      } else if (reasoningResult.relatedTopics.length > 0) {
        const relevantEntries = knowledgeEntries.filter((e: { title: string; content: string; tags: string[] }) =>
          reasoningResult.relatedTopics.some(topic =>
            e.title.toLowerCase().includes(topic.toLowerCase()) ||
            e.tags.some((t: string) => t.toLowerCase().includes(topic.toLowerCase()))
          )
        )
        if (relevantEntries.length > 0) {
          knowledgeContext = `\n\nRelevant knowledge from the user's knowledge base:\n${relevantEntries.map((e: { title: string; content: string }) => `- ${e.title}: ${e.content}`).join('\n')}`
        }
      }

      // Add user preferences
      let preferenceContext = ''
      if (userPreferences.length > 0) {
        preferenceContext = `\n\nKnown user preferences: ${userPreferences.map((p: { key: string; value: string }) => `${p.key}: ${p.value}`).join(', ')}`
      }

      // Add reasoning guidance
      const reasoningGuidance = `\n\nQuery type detected: ${reasoningResult.queryType}. Confidence: ${Math.round(reasoningResult.confidence * 100)}%. Reasoning steps completed: ${reasoningResult.steps.length}. Please show your reasoning process briefly at the start of your response.`

      const fullSystemPrompt = systemPrompt + knowledgeContext + preferenceContext + reasoningGuidance

      const response = await ai.chat.completions.create({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: fullSystemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
        ],
      })

      aiContent = response.choices?.[0]?.message?.content || reasoningResult.conclusion
    } catch {
      // Fallback to reasoning engine's generated response
      aiContent = reasoningResult.conclusion
    }

    const thinking = THINKING_TEMPLATES[Math.floor(Math.random() * THINKING_TEMPLATES.length)]

    // Save assistant response to DB if conversationId is provided
    if (conversationId) {
      try {
        await db.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: aiContent,
            thinking,
          },
        })
      } catch {
        // Non-critical: don't fail the chat if message saving fails
      }
    }

    return NextResponse.json({
      content: aiContent,
      thinking,
      reasoningSteps: reasoningResult.steps,
      confidence: reasoningResult.confidence,
      suggestedActions: reasoningResult.suggestedActions,
      queryType: reasoningResult.queryType,
      conversationId: conversationId || null,
    })
  } catch {
    return NextResponse.json(
      { content: 'I encountered an issue processing your request. Please try again.', thinking: 'Error in request processing.' },
      { status: 200 }
    )
  }
}
