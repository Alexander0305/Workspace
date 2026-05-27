import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET - List all tier limits (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    let tierLimits = await db.tierLimit.findMany({
      orderBy: { priority: 'asc' },
    })

    // If no tier limits exist yet, seed the defaults
    if (tierLimits.length === 0) {
      const defaultTiers = [
        { tier: 'free', maxChatsPerDay: 50, maxImageGenPerDay: 10, maxWebSearchPerDay: 20, maxCodeExecPerDay: 20, maxStorageMB: 100, maxPlugins: 5, maxKnowledgeBase: 100, canUseGlobalAPIs: false, canCreatePlugins: false, canAccessAdmin: false, priority: 0 },
        { tier: 'basic', maxChatsPerDay: 200, maxImageGenPerDay: 50, maxWebSearchPerDay: 100, maxCodeExecPerDay: 100, maxStorageMB: 500, maxPlugins: 10, maxKnowledgeBase: 500, canUseGlobalAPIs: false, canCreatePlugins: false, canAccessAdmin: false, priority: 1 },
        { tier: 'pro', maxChatsPerDay: -1, maxImageGenPerDay: -1, maxWebSearchPerDay: -1, maxCodeExecPerDay: -1, maxStorageMB: 5000, maxPlugins: -1, maxKnowledgeBase: -1, canUseGlobalAPIs: true, canCreatePlugins: true, canAccessAdmin: false, priority: 2 },
        { tier: 'enterprise', maxChatsPerDay: -1, maxImageGenPerDay: -1, maxWebSearchPerDay: -1, maxCodeExecPerDay: -1, maxStorageMB: -1, maxPlugins: -1, maxKnowledgeBase: -1, canUseGlobalAPIs: true, canCreatePlugins: true, canAccessAdmin: true, priority: 3 },
        { tier: 'unlimited', maxChatsPerDay: -1, maxImageGenPerDay: -1, maxWebSearchPerDay: -1, maxCodeExecPerDay: -1, maxStorageMB: -1, maxPlugins: -1, maxKnowledgeBase: -1, canUseGlobalAPIs: true, canCreatePlugins: true, canAccessAdmin: true, priority: 4 },
      ]

      tierLimits = await Promise.all(
        defaultTiers.map(t => db.tierLimit.create({ data: t }))
      )
    }

    return NextResponse.json({ tiers: tierLimits })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch tier limits'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
