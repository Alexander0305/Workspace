import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function maskPassword(pw: string): string {
  if (pw.length <= 4) return '••••'
  return '•'.repeat(pw.length - 2) + pw.slice(-2)
}

export async function GET() {
  try {
    const passwords = await db.passwordEntry.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Return passwords masked for security
    const masked = passwords.map((entry) => ({
      ...entry,
      password: maskPassword(entry.password),
      passwordMasked: true,
    }))

    return NextResponse.json(masked)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch passwords' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, username, password, url, category } = body

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'Name, username, and password are required' },
        { status: 400 }
      )
    }

    const entry = await db.passwordEntry.create({
      data: {
        name,
        username,
        password,
        url,
        category: category || 'general',
      },
    })

    return NextResponse.json(
      { ...entry, password: maskPassword(entry.password), passwordMasked: true },
      { status: 201 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to create password entry' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, username, password, url, category } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Password entry ID is required' },
        { status: 400 }
      )
    }

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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Password entry ID is required' },
        { status: 400 }
      )
    }

    await db.passwordEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete password entry' },
      { status: 500 }
    )
  }
}
