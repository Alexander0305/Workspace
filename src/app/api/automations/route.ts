import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const automations = await db.automation.findMany()
    return NextResponse.json(automations)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch automations' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, trigger, action, enabled } = body

    if (!name || !trigger || !action) {
      return NextResponse.json(
        { error: 'Name, trigger, and action are required' },
        { status: 400 }
      )
    }

    const automation = await db.automation.create({
      data: {
        name,
        trigger,
        action,
        enabled: enabled !== undefined ? enabled : true,
      },
    })

    return NextResponse.json(automation, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create automation' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, trigger, action, enabled } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Automation ID is required' },
        { status: 400 }
      )
    }

    const automation = await db.automation.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(trigger !== undefined && { trigger }),
        ...(action !== undefined && { action }),
        ...(enabled !== undefined && { enabled }),
      },
    })

    return NextResponse.json(automation)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update automation' },
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
        { error: 'Automation ID is required' },
        { status: 400 }
      )
    }

    await db.automation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete automation' },
      { status: 500 }
    )
  }
}
