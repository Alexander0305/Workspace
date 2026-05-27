import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, createAuditLog } from '@/lib/auth'

// GET - List all pending action approvals
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    const approvals = await db.aIActionApproval.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ approvals })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch action approvals'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// POST - Create a new action approval request (from AI chat)
export async function POST(request: NextRequest) {
  try {
    const user = await db.user.findFirst()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { actionType, description, target, payload } = body

    if (!actionType || !description || !target) {
      return NextResponse.json(
        { error: 'actionType, description, and target are required' },
        { status: 400 }
      )
    }

    const approval = await db.aIActionApproval.create({
      data: {
        userId: user.id,
        actionType,
        description,
        target,
        payload: payload ? JSON.stringify(payload) : null,
      },
    })

    return NextResponse.json({ approval }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create action approval'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
