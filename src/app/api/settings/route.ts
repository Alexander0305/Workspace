import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const settings = await db.setting.findMany()
    const map: Record<string, string> = {}
    for (const s of settings) {
      map[s.key] = s.value
    }
    return NextResponse.json(map)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

    const setting = await db.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    })

    return NextResponse.json(setting)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update setting' },
      { status: 500 }
    )
  }
}
