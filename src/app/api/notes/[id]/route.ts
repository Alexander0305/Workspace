import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const note = await db.note.findUnique({ where: { id } })

    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    return NextResponse.json(note)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch note' },
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
    const { title, content, category } = body

    const note = await db.note.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category }),
      },
    })

    return NextResponse.json(note)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update note' },
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
    await db.note.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    )
  }
}
