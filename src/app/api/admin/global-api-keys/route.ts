import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, createAuditLog } from '@/lib/auth'
import { encryptApiKey, maskApiKey, decryptApiKey } from '@/lib/api-key-crypto'
import { z } from 'zod'

const globalApiKeySchema = z.object({
  provider: z.string().max(50),
  apiKey: z.string().min(1).max(500),
  apiSecret: z.string().max(500).optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
  minTier: z.enum(['free', 'basic', 'pro', 'enterprise', 'unlimited']).optional(),
})

// GET - List all global API keys (masked)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request)

    const globalKeys = await db.globalApiKey.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const maskedKeys = globalKeys.map((key) => ({
      id: key.id,
      provider: key.provider,
      apiKeyMasked: maskApiKey(decryptApiKey(key.apiKey)),
      apiSecretMasked: key.apiSecret ? maskApiKey(decryptApiKey(key.apiSecret)) : null,
      baseUrl: key.baseUrl,
      isActive: key.isActive,
      minTier: key.minTier,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }))

    return NextResponse.json({ globalApiKeys: maskedKeys, requestedBy: user.role })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch global API keys'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// POST - Add a new global API key (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request)

    const body = await request.json()
    const validated = globalApiKeySchema.parse(body)

    // Check if a global key already exists for this provider
    const existing = await db.globalApiKey.findUnique({
      where: { provider: validated.provider },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A global API key already exists for this provider. Update it instead.' },
        { status: 409 }
      )
    }

    const encryptedKey = encryptApiKey(validated.apiKey)
    const encryptedSecret = validated.apiSecret ? encryptApiKey(validated.apiSecret) : null

    const globalKey = await db.globalApiKey.create({
      data: {
        provider: validated.provider,
        apiKey: encryptedKey,
        apiSecret: encryptedSecret,
        baseUrl: validated.baseUrl || null,
        isActive: true,
        minTier: validated.minTier || 'free',
      },
    })

    await createAuditLog(user.id, 'global_api_key_created', request, `Provider: ${validated.provider}`)

    return NextResponse.json({
      id: globalKey.id,
      provider: globalKey.provider,
      apiKeyMasked: maskApiKey(validated.apiKey),
      baseUrl: globalKey.baseUrl,
      isActive: globalKey.isActive,
      minTier: globalKey.minTier,
      createdAt: globalKey.createdAt,
    }, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: (err as { errors: unknown[] }).errors }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Failed to add global API key'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
