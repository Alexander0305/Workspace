import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const features = await db.featureFlag.findMany({
      orderBy: [{ sortOrder: 'asc' }, { category: 'asc' }],
    })
    return NextResponse.json(features)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch feature flags' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Support single flag creation
    if (!Array.isArray(body)) {
      const { key, name, description, category, enabled, configurable, requiresRestart, sortOrder } = body

      if (!key || !name || !description) {
        return NextResponse.json(
          { error: 'Key, name, and description are required' },
          { status: 400 }
        )
      }

      const feature = await db.featureFlag.upsert({
        where: { key },
        update: {
          name,
          description,
          ...(category !== undefined && { category }),
          ...(enabled !== undefined && { enabled }),
          ...(configurable !== undefined && { configurable }),
          ...(requiresRestart !== undefined && { requiresRestart }),
          ...(sortOrder !== undefined && { sortOrder }),
        },
        create: {
          key,
          name,
          description,
          category: category ?? 'general',
          enabled: enabled ?? true,
          configurable: configurable ?? true,
          requiresRestart: requiresRestart ?? false,
          sortOrder: sortOrder ?? 0,
        },
      })

      return NextResponse.json(feature)
    }

    // Support seeding multiple flags at once
    const results = []
    for (const flag of body) {
      const { key, name, description, category, enabled, configurable, requiresRestart, sortOrder } = flag

      if (!key || !name || !description) continue

      const feature = await db.featureFlag.upsert({
        where: { key },
        update: {
          name,
          description,
          ...(category !== undefined && { category }),
          ...(enabled !== undefined && { enabled }),
          ...(configurable !== undefined && { configurable }),
          ...(requiresRestart !== undefined && { requiresRestart }),
          ...(sortOrder !== undefined && { sortOrder }),
        },
        create: {
          key,
          name,
          description,
          category: category ?? 'general',
          enabled: enabled ?? true,
          configurable: configurable ?? true,
          requiresRestart: requiresRestart ?? false,
          sortOrder: sortOrder ?? 0,
        },
      })
      results.push(feature)
    }

    return NextResponse.json({ created: results.length, features: results })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create feature flags' },
      { status: 500 }
    )
  }
}
