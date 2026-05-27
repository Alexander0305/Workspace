import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const entry = await db.knowledgeEntry.findUnique({ where: { id } })

    if (!entry) {
      return NextResponse.json(
        { error: 'Knowledge entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ ...entry, tags: JSON.parse(entry.tags || '[]') })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch knowledge entry' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, content, category, tags } = body

    const entry = await db.knowledgeEntry.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category }),
        ...(tags !== undefined && { tags: JSON.stringify(tags) }),
      },
    })

    return NextResponse.json({ ...entry, tags: JSON.parse(entry.tags || '[]') })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update knowledge entry' },
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
    await db.knowledgeEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete knowledge entry' },
      { status: 500 }
    )
  }
}
