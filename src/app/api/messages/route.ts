import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (conversationId) {
      const messages = await db.message.findMany({
        where: { conversationId },
        orderBy: { timestamp: 'asc' },
      })
      return NextResponse.json(messages)
    }

    const messages = await db.message.findMany({
      orderBy: { timestamp: 'desc' },
      take: 100,
    })
    return NextResponse.json(messages)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, role, content, thinking } = body

    if (!conversationId || !role || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: conversationId, role, content' },
        { status: 400 }
      )
    }

    const message = await db.message.create({
      data: {
        conversationId,
        role,
        content,
        thinking,
      },
    })

    return NextResponse.json(message, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    )
  }
}
