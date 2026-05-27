import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, category, enabled, configurable, requiresRestart, sortOrder } = body

    // Check if the flag exists
    const existing = await db.featureFlag.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      )
    }

    const feature = await db.featureFlag.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(enabled !== undefined && { enabled }),
        ...(configurable !== undefined && { configurable }),
        ...(requiresRestart !== undefined && { requiresRestart }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    })

    return NextResponse.json(feature)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update feature flag' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if the flag exists
    const existing = await db.featureFlag.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Feature flag not found' },
        { status: 404 }
      )
    }

    await db.featureFlag.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete feature flag' },
      { status: 500 }
    )
  }
}
