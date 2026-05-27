import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const notifications = await db.notification.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(notifications)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, message, type } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      )
    }

    const notification = await db.notification.create({
      data: {
        title,
        message,
        type: type || 'info',
      },
    })

    return NextResponse.json(notification, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    await db.notification.deleteMany()
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to clear notifications' },
      { status: 500 }
    )
  }
}
