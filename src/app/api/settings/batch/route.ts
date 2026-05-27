import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { settings } = body as { settings: Record<string, string> }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      )
    }

    const results = []
    for (const [key, value] of Object.entries(settings)) {
      const setting = await db.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
      results.push(setting)
    }

    return NextResponse.json({ updated: results.length, settings: results })
  } catch {
    return NextResponse.json(
      { error: 'Failed to batch update settings' },
      { status: 500 }
    )
  }
}
