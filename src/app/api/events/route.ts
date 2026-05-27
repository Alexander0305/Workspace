import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const events = await db.calendarEvent.findMany({
      orderBy: { date: 'asc' },
    })
    return NextResponse.json(events)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, date, time, type, description } = body

    if (!title || !date) {
      return NextResponse.json(
        { error: 'Title and date are required' },
        { status: 400 }
      )
    }

    const event = await db.calendarEvent.create({
      data: {
        title,
        date,
        time,
        type: type || 'event',
        description,
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    await db.calendarEvent.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}
