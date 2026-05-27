import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const automation = await db.automation.findUnique({ where: { id } })

    if (!automation) {
      return NextResponse.json(
        { error: 'Automation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(automation)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch automation' },
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
    const { name, trigger, action, enabled } = body

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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.automation.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete automation' },
      { status: 500 }
    )
  }
}
