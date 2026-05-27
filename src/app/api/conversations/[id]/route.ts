import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const conversation = await db.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { timestamp: 'asc' } } },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...conversation,
      messageCount: conversation.messages.length,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, personality } = body

    const conversation = await db.conversation.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(personality !== undefined && { personality }),
      },
    })

    return NextResponse.json(conversation)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.conversation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}
