import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const event = await db.calendarEvent.findUnique({ where: { id } })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch event' },
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
    const { title, date, time, type, description } = body

    const event = await db.calendarEvent.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date }),
        ...(time !== undefined && { time }),
        ...(type !== undefined && { type }),
        ...(description !== undefined && { description }),
      },
    })

    return NextResponse.json(event)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update event' },
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
    await db.calendarEvent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}
