import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, createAuditLog } from '@/lib/auth'
import { z } from 'zod'

const updateRuleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  category: z.enum(['ethics', 'limitations', 'behavior', 'custom']).optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  isSystem: z.boolean().optional(),
})

// GET - Get single AI rule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request)
    const { id } = await params

    const rule = await db.aIRule.findUnique({ where: { id } })
    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }
    return NextResponse.json({ rule })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch AI rule'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// PUT - Update an AI rule
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request)
    const { id } = await params

    const existing = await db.aIRule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateRuleSchema.parse(body)

    const rule = await db.aIRule.update({
      where: { id },
      data: validated,
    })

    await createAuditLog(admin.id, 'admin_update_ai_rule', request, `Updated rule: ${rule.title}`)

    return NextResponse.json({ rule })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: (err as unknown as { errors: unknown[] }).errors },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to update AI rule'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE - Delete an AI rule (system rules cannot be deleted)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request)
    const { id } = await params

    const existing = await db.aIRule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    if (existing.isSystem) {
      return NextResponse.json(
        { error: 'System rules cannot be deleted. You can disable them instead.' },
        { status: 403 }
      )
    }

    await db.aIRule.delete({ where: { id } })

    await createAuditLog(admin.id, 'admin_delete_ai_rule', request, `Deleted rule: ${existing.title}`)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete AI rule'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
