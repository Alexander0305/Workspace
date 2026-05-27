import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Get current user's usage stats for today
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get today's usage records grouped by action
    const usageRecords = await db.usageRecord.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: today },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by action
    const byAction: Record<string, { count: number; tokensUsed: number; cost: number; providers: Record<string, number> }> = {}
    for (const record of usageRecords) {
      if (!byAction[record.action]) {
        byAction[record.action] = { count: 0, tokensUsed: 0, cost: 0, providers: {} }
      }
      byAction[record.action].count++
      byAction[record.action].tokensUsed += record.tokensUsed
      byAction[record.action].cost += record.cost
      if (record.provider) {
        byAction[record.action].providers[record.provider] = (byAction[record.action].providers[record.provider] || 0) + 1
      }
    }

    // Get tier limits
    const tierLimit = await db.tierLimit.findUnique({
      where: { tier: user.tier },
    })

    const limits = tierLimit ? {
      maxChatsPerDay: tierLimit.maxChatsPerDay,
      maxImageGenPerDay: tierLimit.maxImageGenPerDay,
      maxWebSearchPerDay: tierLimit.maxWebSearchPerDay,
      maxCodeExecPerDay: tierLimit.maxCodeExecPerDay,
    } : null

    // Get per-provider usage (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const providerUsage = await db.usageRecord.findMany({
      where: {
        userId: user.id,
        provider: { not: null },
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        provider: true,
        action: true,
        tokensUsed: true,
        cost: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const byProvider: Record<string, { count: number; tokensUsed: number; cost: number; actions: Record<string, number> }> = {}
    for (const record of providerUsage) {
      const provider = record.provider || 'unknown'
      if (!byProvider[provider]) {
        byProvider[provider] = { count: 0, tokensUsed: 0, cost: 0, actions: {} }
      }
      byProvider[provider].count++
      byProvider[provider].tokensUsed += record.tokensUsed
      byProvider[provider].cost += record.cost
      byProvider[provider].actions[record.action] = (byProvider[provider].actions[record.action] || 0) + 1
    }

    return NextResponse.json({
      today: byAction,
      providerUsage: byProvider,
      tier: user.tier,
      limits,
      totalTokensUsed: usageRecords.reduce((sum, r) => sum + r.tokensUsed, 0),
      totalCost: usageRecords.reduce((sum, r) => sum + r.cost, 0),
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch usage stats' }, { status: 500 })
  }
}
