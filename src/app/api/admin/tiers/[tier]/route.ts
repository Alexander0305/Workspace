import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, createAuditLog } from '@/lib/auth'
import { z } from 'zod'

const updateTierSchema = z.object({
  maxChatsPerDay: z.number().optional(),
  maxImageGenPerDay: z.number().optional(),
  maxWebSearchPerDay: z.number().optional(),
  maxCodeExecPerDay: z.number().optional(),
  maxStorageMB: z.number().optional(),
  maxPlugins: z.number().optional(),
  maxKnowledgeBase: z.number().optional(),
  canUseGlobalAPIs: z.boolean().optional(),
  canCreatePlugins: z.boolean().optional(),
  canAccessAdmin: z.boolean().optional(),
  priority: z.number().optional(),
})

// PUT - Update a tier's limits (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tier: string }> }
) {
  try {
    const admin = await requireAdmin(request)
    const { tier } = await params

    const body = await request.json()
    const validated = updateTierSchema.parse(body)

    const existing = await db.tierLimit.findUnique({ where: { tier } })
    if (!existing) {
      return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
    }

    const updated = await db.tierLimit.update({
      where: { tier },
      data: validated,
    })

    await createAuditLog(admin.id, 'admin_update_tier', request, `Updated tier: ${tier}`)

    return NextResponse.json({ tier: updated })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: (err as unknown as { errors: unknown[] }).errors },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to update tier'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
