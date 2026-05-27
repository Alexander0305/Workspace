import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, category, ids } = body as {
      action: 'enable' | 'disable'
      category?: string
      ids?: string[]
    }

    if (!action || (action !== 'enable' && action !== 'disable')) {
      return NextResponse.json(
        { error: 'Action must be "enable" or "disable"' },
        { status: 400 }
      )
    }

    const enabled = action === 'enable'

    // Determine which flags to update
    let where: Record<string, unknown> = {}

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Toggle specific flags by IDs
      where = { id: { in: ids } }
    } else if (category) {
      // Toggle all flags in a category
      where = { category }
    }
    // If neither ids nor category, toggle all flags (empty where = match all)

    const result = await db.featureFlag.updateMany({
      where,
      data: { enabled },
    })

    return NextResponse.json({
      action,
      updated: result.count,
      filter: ids
        ? { ids }
        : category
          ? { category }
          : { all: true },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to batch update feature flags' },
      { status: 500 }
    )
  }
}
