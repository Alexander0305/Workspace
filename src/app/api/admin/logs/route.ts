import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { action, details, userId } = await request.json()

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    const log = await db.adminLog.create({
      data: {
        action,
        details: details || null,
        userId: userId || 'admin',
      },
    })

    return NextResponse.json(log)
  } catch {
    return NextResponse.json(
      { error: 'Failed to create admin log' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const action = searchParams.get('action') || undefined

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (action) {
      where.action = action
    }

    const [logs, total] = await Promise.all([
      db.adminLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      db.adminLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch admin logs' },
      { status: 500 }
    )
  }
}
