import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, requireAdmin, createAuditLog } from '@/lib/auth'
import { z } from 'zod'

const createUserSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(50),
  password: z.string().min(6).max(100),
  name: z.string().max(100).optional(),
  role: z.enum(['admin', 'user']).optional().default('user'),
  tier: z.enum(['free', 'basic', 'pro', 'enterprise', 'unlimited']).optional().default('free'),
})

// GET - List all users with pagination (admin only)
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const tier = searchParams.get('tier') || ''

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { email: { contains: search } },
        { username: { contains: search } },
        { name: { contains: search } },
      ]
    }
    if (role) where.role = role
    if (tier) where.tier = tier

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          avatar: true,
          role: true,
          tier: true,
          isActive: true,
          emailVerified: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { sessions: true, apiKeys: true, usageRecords: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ])

    await createAuditLog(admin.id, 'admin_list_users', request, `Page ${page}, ${users.length} users`)

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list users'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// POST - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    const body = await request.json()
    const validated = createUserSchema.parse(body)

    // Check if email or username already exists
    const existing = await db.user.findFirst({
      where: {
        OR: [
          { email: validated.email },
          { username: validated.username },
        ],
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: existing.email === validated.email ? 'Email already in use' : 'Username already in use' },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(validated.password)

    const user = await db.user.create({
      data: {
        email: validated.email,
        username: validated.username,
        passwordHash,
        name: validated.name || null,
        role: validated.role,
        tier: validated.tier,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        tier: true,
        isActive: true,
        createdAt: true,
      },
    })

    await createAuditLog(admin.id, 'admin_create_user', request, `Created user ${user.username} (${user.email})`)

    return NextResponse.json({ user }, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: (err as unknown as { errors: unknown[] }).errors },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to create user'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
