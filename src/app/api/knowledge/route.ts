import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const entries = await db.knowledgeEntry.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    // Parse tags from JSON string
    const parsed = entries.map((entry) => ({
      ...entry,
      tags: JSON.parse(entry.tags || '[]'),
    }))

    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch knowledge entries' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, content, category, tags } = body

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const entry = await db.knowledgeEntry.create({
      data: {
        title,
        content,
        category: category || 'general',
        tags: JSON.stringify(tags || []),
      },
    })

    return NextResponse.json(
      { ...entry, tags: JSON.parse(entry.tags || '[]') },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to create knowledge entry' },
      { status: 500 }
    )
  }
}
