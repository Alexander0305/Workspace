import { NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { db } from '@/lib/db'
import { hashPassword, createSession, createAuditLog } from '@/lib/auth'
import { seedTierLimits } from '@/lib/tier-seed'

const registerSchema = z.object({
  email: z.email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  name: z.string().max(100).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = registerSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      )
    }

    const { email, username, password, name } = result.data

    // Check if email already exists
    const existingEmail = await db.user.findUnique({ where: { email } })
    if (existingEmail) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Check if username already exists
    const existingUsername = await db.user.findUnique({ where: { username } })
    if (existingUsername) {
      return NextResponse.json(
        { error: 'This username is already taken' },
        { status: 409 }
      )
    }

    // Hash the password
    const passwordHash = hashPassword(password)

    // Create the user
    const user = await db.user.create({
      data: {
        email,
        username,
        passwordHash,
        name: name || null,
        role: 'user',
        tier: 'free',
      },
    })

    // Ensure tier limits are seeded
    await seedTierLimits()

    // Create session
    const userAgent = request.headers.get('user-agent') || undefined
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      undefined
    const token = await createSession(user.id, userAgent, ipAddress)

    // Audit log
    await createAuditLog(user.id, 'user.register', request, `User ${username} registered`)

    // Return user data (without password hash) and token
    const { passwordHash: _, ...safeUser } = user
    return NextResponse.json(
      {
        user: safeUser,
        token,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
