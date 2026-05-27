import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    })

    const result = conversations.map((conv) => ({
      ...conv,
      messageCount: conv._count.messages,
    }))

    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, personality } = body

    const conversation = await db.conversation.create({
      data: {
        title: title || 'New Conversation',
        personality: personality || 'nova',
      },
    })

    return NextResponse.json(conversation, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
