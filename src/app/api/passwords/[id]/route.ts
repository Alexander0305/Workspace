import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function maskPassword(pw: string): string {
  if (pw.length <= 4) return '••••'
  return '•'.repeat(pw.length - 2) + pw.slice(-2)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const entry = await db.passwordEntry.findUnique({ where: { id } })

    if (!entry) {
      return NextResponse.json(
        { error: 'Password entry not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { ...entry, password: maskPassword(entry.password), passwordMasked: true }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch password entry' },
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
    const { name, username, password, url, category } = body

    const entry = await db.passwordEntry.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(username !== undefined && { username }),
        ...(password !== undefined && { password }),
        ...(url !== undefined && { url }),
        ...(category !== undefined && { category }),
      },
    })

    return NextResponse.json(
      { ...entry, password: maskPassword(entry.password), passwordMasked: true }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to update password entry' },
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
    await db.passwordEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete password entry' },
      { status: 500 }
    )
  }
}
