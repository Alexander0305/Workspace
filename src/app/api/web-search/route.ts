import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, checkTierLimit, recordUsage } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check tier limit
    const canSearch = await checkTierLimit(user.id, 'web_search')
    if (!canSearch) {
      return NextResponse.json(
        { error: 'Daily web search limit reached. Upgrade your tier for more.' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('query')
    const num = parseInt(searchParams.get('num') || '10', 10)
    const recencyDays = parseInt(searchParams.get('recency_days') || '7', 10)

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      )
    }

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const ai = await ZAI.create()

    const results = await ai.functions.invoke('web_search', {
      query: query.trim(),
      num,
      recency_days: recencyDays,
    })

    // Record usage
    await recordUsage(user.id, 'web_search')

    return NextResponse.json({
      query: query.trim(),
      results: results || [],
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Web search error:', error)
    const message = error instanceof Error ? error.message : 'Failed to perform web search'
    return NextResponse.json(
      { error: message, results: [] },
      { status: 500 }
    )
  }
}
