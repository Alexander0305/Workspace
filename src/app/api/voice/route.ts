import { NextRequest, NextResponse } from 'next/server'

// ── Intent definitions with keywords for fuzzy matching ────────────────────

interface IntentDef {
  id: string
  label: string
  keywords: string[]
  suggestedActions: string[]
}

const INTENTS: IntentDef[] = [
  {
    id: 'navigate',
    label: 'Navigation',
    keywords: ['go to', 'navigate', 'open', 'switch to', 'show me', 'take me to', 'visit', 'jump to', 'move to', 'direct me'],
    suggestedActions: ['switch_view', 'open_page', 'scroll_to'],
  },
  {
    id: 'search',
    label: 'Search',
    keywords: ['search', 'find', 'look up', 'lookup', 'where is', 'what is', 'who is', 'locate', 'query', 'google', 'look for'],
    suggestedActions: ['web_search', 'search_knowledge', 'search_files'],
  },
  {
    id: 'create',
    label: 'Create',
    keywords: ['create', 'make', 'generate', 'new', 'add', 'build', 'compose', 'write', 'draft', 'produce', 'start'],
    suggestedActions: ['create_item', 'generate_content', 'new_record'],
  },
  {
    id: 'delete',
    label: 'Delete',
    keywords: ['delete', 'remove', 'erase', 'clear', 'destroy', 'discard', 'drop', 'eliminate', 'get rid of'],
    suggestedActions: ['delete_item', 'confirm_deletion', 'archive_instead'],
  },
  {
    id: 'toggle',
    label: 'Toggle',
    keywords: ['toggle', 'turn on', 'turn off', 'enable', 'disable', 'switch', 'activate', 'deactivate', 'flip', 'on', 'off'],
    suggestedActions: ['toggle_setting', 'enable_feature', 'disable_feature'],
  },
  {
    id: 'query_status',
    label: 'Query Status',
    keywords: ['status', 'how is', 'what is the', 'current', 'check', 'monitor', 'health', 'uptime', 'performance', 'running', 'working', 'okay'],
    suggestedActions: ['check_status', 'show_metrics', 'refresh_data'],
  },
  {
    id: 'set_setting',
    label: 'Set Setting',
    keywords: ['set', 'change', 'update', 'configure', 'adjust', 'modify', 'update the', 'change the', 'set the', 'configure the'],
    suggestedActions: ['update_setting', 'save_config', 'apply_changes'],
  },
  {
    id: 'weather',
    label: 'Weather',
    keywords: ['weather', 'temperature', 'forecast', 'rain', 'snow', 'sunny', 'cloudy', 'wind', 'storm', 'climate'],
    suggestedActions: ['get_weather', 'show_forecast'],
  },
  {
    id: 'email',
    label: 'Email',
    keywords: ['email', 'mail', 'send email', 'compose email', 'inbox', 'draft email', 'reply'],
    suggestedActions: ['compose_email', 'check_inbox', 'send_message'],
  },
  {
    id: 'coding',
    label: 'Coding',
    keywords: ['code', 'program', 'function', 'debug', 'implement', 'deploy', 'build', 'algorithm', 'database', 'server', 'api', 'refactor', 'compile'],
    suggestedActions: ['generate_code', 'explain_code', 'debug_code'],
  },
  {
    id: 'analysis',
    label: 'Analysis',
    keywords: ['analyze', 'data', 'compare', 'evaluate', 'assess', 'review', 'pros and cons', 'breakdown', 'investigate', 'chart', 'graph', 'statistics'],
    suggestedActions: ['analyze_data', 'show_comparison', 'generate_report'],
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    keywords: ['schedule', 'remind', 'alarm', 'calendar', 'meeting', 'appointment', 'event', 'timer', 'deadline'],
    suggestedActions: ['create_event', 'set_reminder', 'show_calendar'],
  },
  {
    id: 'greeting',
    label: 'Greeting',
    keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy', 'greetings', 'sup'],
    suggestedActions: ['respond_greeting', 'show_dashboard'],
  },
]

// ── Fuzzy matching with confidence scoring ─────────────────────────────────

function classifyIntent(transcript: string): {
  intent: string
  confidence: number
  matchedKeywords: string[]
  suggestedActions: string[]
} {
  const lower = transcript.toLowerCase()
  const words = lower.split(/\s+/)

  let bestIntent = 'general'
  let bestConfidence = 0
  let bestKeywords: string[] = []
  let bestActions: string[] = ['respond_general']

  for (const intentDef of INTENTS) {
    let matchCount = 0
    const matched: string[] = []

    for (const keyword of intentDef.keywords) {
      // Fuzzy match: check if keyword appears anywhere in the transcript
      if (lower.includes(keyword)) {
        matchCount++
        matched.push(keyword)
      }
    }

    if (matchCount === 0) continue

    // Confidence based on keyword overlap:
    // - More matched keywords = higher confidence
    // - Longer keyword matches = higher confidence (multi-word phrases are stronger signals)
    // - Proportion of matched keywords vs total available
    const avgKeywordLen = intentDef.keywords.reduce((sum, k) => sum + k.split(' ').length, 0) / intentDef.keywords.length
    const keywordRatio = matchCount / intentDef.keywords.length
    const lengthBonus = matched.reduce((sum, k) => sum + k.split(' ').length, 0) / (words.length || 1)

    let confidence = Math.min(0.5 + keywordRatio * 0.3 + lengthBonus * 0.2, 0.98)

    // Boost for multi-word keyword matches (they are stronger signals)
    const multiWordMatches = matched.filter(k => k.includes(' ')).length
    confidence += multiWordMatches * 0.02

    // Small boost if the matched keyword is near the start of the command
    for (const kw of matched) {
      const idx = lower.indexOf(kw)
      if (idx < words.length / 2) {
        confidence += 0.02
      }
    }

    confidence = Math.min(confidence, 0.98)

    if (confidence > bestConfidence) {
      bestConfidence = confidence
      bestIntent = intentDef.id
      bestKeywords = matched
      bestActions = intentDef.suggestedActions
    }
  }

  // If no intent matched at all, return general with low confidence
  if (bestConfidence === 0) {
    return {
      intent: 'general',
      confidence: 0.3,
      matchedKeywords: [],
      suggestedActions: ['respond_general', 'ask_clarification'],
    }
  }

  return {
    intent: bestIntent,
    confidence: Math.round(bestConfidence * 100) / 100,
    matchedKeywords: bestKeywords,
    suggestedActions: bestActions,
  }
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { transcript } = body

    if (!transcript) {
      return NextResponse.json(
        { text: '', intent: 'unknown', confidence: 0, suggestedActions: [], matchedKeywords: [] },
        { status: 200 }
      )
    }

    const result = classifyIntent(transcript)

    return NextResponse.json({
      text: transcript,
      intent: result.intent,
      confidence: result.confidence,
      matchedKeywords: result.matchedKeywords,
      suggestedActions: result.suggestedActions,
      timestamp: new Date().toISOString(),
    })
  } catch {
    return NextResponse.json(
      { text: '', intent: 'error', confidence: 0, suggestedActions: [], matchedKeywords: [] },
      { status: 200 }
    )
  }
}
