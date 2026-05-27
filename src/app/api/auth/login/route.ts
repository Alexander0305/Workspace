import { NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { db } from '@/lib/db'
import { verifyPassword, createSession, createAuditLog } from '@/lib/auth'

const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      )
    }

    const { email, password } = result.data

    // Find user by email
    const user = await db.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account has been deactivated. Please contact support.' },
        { status: 403 }
      )
    }

    // Verify password
    const isValid = verifyPassword(password, user.passwordHash)
    if (!isValid) {
      // Audit log for failed login
      await createAuditLog(user.id, 'auth.login_failed', request, 'Invalid password attempt')
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create session + update last login in parallel (reduces total request time)
    const userAgent = request.headers.get('user-agent') || undefined
    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      undefined
    const [token] = await Promise.all([
      createSession(user.id, userAgent, ipAddress),
      db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } }),
    ])

    // Fire-and-forget audit log (don't await to reduce latency)
    createAuditLog(user.id, 'auth.login', request, 'User logged in successfully').catch(() => {})

    // Return user data (without password hash) and token
    const { passwordHash: _, ...safeUser } = user
    return NextResponse.json({
      user: { ...safeUser, lastLogin: new Date() },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
