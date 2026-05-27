import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, createAuditLog } from '@/lib/auth'
import { z } from 'zod'

const createRuleSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.enum(['ethics', 'limitations', 'behavior', 'custom']).default('custom'),
  enabled: z.boolean().default(true),
  priority: z.number().int().min(0).max(1000).default(0),
  isSystem: z.boolean().default(false),
  source: z.enum(['admin', 'auto-generated']).default('admin'),
})

// GET - List all AI rules
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const rules = await db.aIRule.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ rules })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch AI rules'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// POST - Create a new AI rule
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    const body = await request.json()
    const validated = createRuleSchema.parse(body)

    const rule = await db.aIRule.create({
      data: validated,
    })

    await createAuditLog(admin.id, 'admin_create_ai_rule', request, `Created rule: ${validated.title}`)

    return NextResponse.json({ rule }, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: (err as unknown as { errors: unknown[] }).errors },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to create AI rule'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
