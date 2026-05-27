import crypto from 'crypto'
import { db } from '@/lib/db'

const SCRYPT_KEY_LENGTH = 32 // Reduced from 64 for lower memory usage
const SCRYPT_SALT_LENGTH = 16 // Reduced from 32 for lower memory usage
// Use lighter scrypt parameters: N=2048, r=8, p=1 (~16MB vs default 128MB)
const SCRYPT_OPTIONS = { N: 2048, r: 8, p: 1 }
const SESSION_TOKEN_LENGTH = 48
const SESSION_DURATION_DAYS = 30

/**
 * Hash a password using scrypt with a random salt.
 * Format: scrypt:<hex-salt>:<hex-derived-key>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SCRYPT_SALT_LENGTH)
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS)
  return `scrypt:${salt.toString('hex')}:${derivedKey.toString('hex')}`
}

/**
 * Verify a password against a stored hash.
 * Supports the scrypt:salt:hash format.
 */
export function verifyPassword(password: string, hash: string): boolean {
  const parts = hash.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false
  }
  const salt = Buffer.from(parts[1], 'hex')
  const storedKeyBuffer = Buffer.from(parts[2], 'hex')
  const keyLength = storedKeyBuffer.length

  // Always use light scrypt params to avoid OOM in constrained environments
  // This matches the hashPassword function which uses the same SCRYPT_OPTIONS
  const derivedKey = crypto.scryptSync(password, salt, keyLength, SCRYPT_OPTIONS)

  return crypto.timingSafeEqual(storedKeyBuffer, derivedKey)
}

/**
 * Create a new session for a user.
 * Returns the session token.
 */
export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const token = crypto.randomBytes(SESSION_TOKEN_LENGTH).toString('hex')
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

  await db.session.create({
    data: {
      userId,
      token,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      expiresAt,
    },
  })

  return token
}

/**
 * Get the user associated with a session token.
 * Returns null if session is invalid or expired.
 */
export async function getSession(token: string) {
  if (!token) return null

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session) return null
  if (session.expiresAt < new Date()) {
    // Clean up expired session
    await db.session.delete({ where: { id: session.id } })
    return null
  }
  if (!session.user.isActive) return null

  return session.user
}

/**
 * Get the current user from a request object.
 * Checks Authorization: Bearer header first, then cookies.
 */
export async function getCurrentUser(request: Request) {
  let token: string | null = null

  // Check Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  }

  // Check cookie as fallback
  if (!token) {
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
          const [key, ...v] = c.trim().split('=')
          return [key, v.join('=')]
        })
      )
      token = cookies['nova-session'] || null
    }
  }

  if (!token) return null
  return getSession(token)
}

/**
 * Require admin role. Throws if user is not admin.
 */
export async function requireAdmin(request: Request) {
  const user = await getCurrentUser(request)
  if (!user) {
    throw new Error('Authentication required')
  }
  if (user.role !== 'admin') {
    throw new Error('Admin access required')
  }
  return user
}

/**
 * Check if a user can perform an action based on their tier limits.
 * Returns true if allowed, false if limit exceeded.
 */
export async function checkTierLimit(
  userId: string,
  action: string
): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) return false

  // Unlimited tier has no limits
  if (user.tier === 'unlimited') return true

  const tierLimit = await db.tierLimit.findUnique({
    where: { tier: user.tier },
  })

  if (!tierLimit) return true // No limits defined, allow by default

  // Calculate the start of today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Count today's usage for this action
  const todayUsage = await db.usageRecord.count({
    where: {
      userId,
      action,
      createdAt: { gte: today },
    },
  })

  // Map action to the corresponding tier limit field
  const actionLimitMap: Record<string, number> = {
    chat: tierLimit.maxChatsPerDay,
    image_gen: tierLimit.maxImageGenPerDay,
    web_search: tierLimit.maxWebSearchPerDay,
    code_execute: tierLimit.maxCodeExecPerDay,
  }

  const limit = actionLimitMap[action]
  if (limit === undefined) return true // Unknown action, allow

  // Enterprise tier: -1 means unlimited
  if (limit === -1) return true

  return todayUsage < limit
}

/**
 * Record a usage event for a user.
 */
export async function recordUsage(
  userId: string,
  action: string,
  provider?: string,
  tokens?: number,
  cost?: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.usageRecord.create({
    data: {
      userId,
      action,
      provider: provider || null,
      tokensUsed: tokens || 0,
      cost: cost || 0,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}

/**
 * Delete a session by token.
 */
export async function deleteSession(token: string): Promise<void> {
  try {
    await db.session.delete({ where: { token } })
  } catch {
    // Session may not exist, ignore error
  }
}

/**
 * Create an audit log entry.
 */
export async function createAuditLog(
  userId: string,
  action: string,
  request?: Request,
  details?: string
): Promise<void> {
  await db.auditLog.create({
    data: {
      userId,
      action,
      details: details || null,
      ipAddress: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || null,
      userAgent: request?.headers.get('user-agent') || null,
    },
  })
}
