import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, createAuditLog } from '@/lib/auth'
import { z } from 'zod'

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().min(2).max(50).optional(),
  name: z.string().max(100).optional(),
  role: z.enum(['admin', 'user']).optional(),
  tier: z.enum(['free', 'basic', 'pro', 'enterprise', 'unlimited']).optional(),
  isActive: z.boolean().optional(),
})

// GET - Get user details (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request)
    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
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
        sessions: {
          select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        apiKeys: {
          select: { id: true, provider: true, isActive: true, lastUsed: true, createdAt: true },
        },
        _count: { select: { usageRecords: true, auditLogs: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get user'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// PUT - Update user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request)
    const { id } = await params

    const body = await request.json()
    const validated = updateUserSchema.parse(body)

    // Check if user exists
    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check for email/username conflicts
    if (validated.email || validated.username) {
      const conflict = await db.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(validated.email ? [{ email: validated.email }] : []),
                ...(validated.username ? [{ username: validated.username }] : []),
              ],
            },
          ],
        },
      })
      if (conflict) {
        return NextResponse.json(
          { error: conflict.email === validated.email ? 'Email already in use' : 'Username already in use' },
          { status: 409 }
        )
      }
    }

    // Prevent admin from deactivating themselves
    if (validated.isActive === false && id === admin.id) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Prevent admin from removing their own admin role
    if (validated.role === 'user' && id === admin.id) {
      return NextResponse.json(
        { error: 'Cannot remove admin role from your own account' },
        { status: 400 }
      )
    }

    const user = await db.user.update({
      where: { id },
      data: validated,
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        tier: true,
        isActive: true,
        updatedAt: true,
      },
    })

    const changes = Object.keys(validated).join(', ')
    await createAuditLog(admin.id, 'admin_update_user', request, `Updated user ${user.username}: ${changes}`)

    return NextResponse.json({ user })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input', details: (err as unknown as { errors: unknown[] }).errors },
        { status: 400 }
      )
    }
    const message = err instanceof Error ? err.message : 'Failed to update user'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request)
    const { id } = await params

    // Prevent admin from deleting themselves
    if (id === admin.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await db.user.delete({ where: { id } })

    await createAuditLog(admin.id, 'admin_delete_user', request, `Deleted user ${existing.username} (${existing.email})`)

    return NextResponse.json({ success: true, message: `User ${existing.username} deleted` })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete user'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
