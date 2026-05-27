import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, createAuditLog } from '@/lib/auth'

// PUT - Approve or reject an action approval
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request)
    const { id } = await params

    const body = await request.json()
    const { status, reviewNote } = body

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "approved" or "rejected"' },
        { status: 400 }
      )
    }

    const existing = await db.aIActionApproval.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 })
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: `This request has already been ${existing.status}` },
        { status: 400 }
      )
    }

    const approval = await db.aIActionApproval.update({
      where: { id },
      data: {
        status,
        reviewedBy: admin.id,
        reviewNote: reviewNote || null,
        reviewedAt: new Date(),
      },
    })

    await createAuditLog(
      admin.id,
      status === 'approved' ? 'admin_approve_ai_action' : 'admin_reject_ai_action',
      request,
      `${status} AI action: ${existing.description}`
    )

    return NextResponse.json({ approval })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update action approval'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
