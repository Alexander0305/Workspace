import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const notes = await db.note.findMany({
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(notes)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, content, category } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const note = await db.note.create({
      data: {
        title,
        content,
        category: category || 'general',
      },
    })

    return NextResponse.json(note, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create note' },
      { status: 500 }
    )
  }
}
