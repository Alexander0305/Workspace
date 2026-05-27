import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { apiKeySchema } from '@/lib/validation'
import { encryptApiKey, maskApiKey, decryptApiKey } from '@/lib/api-key-crypto'

// GET - List current user's API keys (masked)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const apiKeys = await db.userApiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    const maskedKeys = apiKeys.map((key) => ({
      id: key.id,
      provider: key.provider,
      apiKeyMasked: maskApiKey(decryptApiKey(key.apiKey)),
      apiSecretMasked: key.apiSecret ? maskApiKey(decryptApiKey(key.apiSecret)) : null,
      baseUrl: key.baseUrl,
      label: key.label,
      isActive: key.isActive,
      lastUsed: key.lastUsed,
      createdAt: key.createdAt,
      updatedAt: key.updatedAt,
    }))

    return NextResponse.json({ apiKeys: maskedKeys })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

// POST - Add a new API key
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const validated = apiKeySchema.parse(body)

    // Check if user already has a key for this provider
    const existing = await db.userApiKey.findFirst({
      where: { userId: user.id, provider: validated.provider },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You already have an API key for this provider. Update it instead.' },
        { status: 409 }
      )
    }

    const encryptedKey = encryptApiKey(validated.apiKey)
    const encryptedSecret = validated.apiSecret ? encryptApiKey(validated.apiSecret) : null

    const apiKey = await db.userApiKey.create({
      data: {
        userId: user.id,
        provider: validated.provider,
        apiKey: encryptedKey,
        apiSecret: encryptedSecret,
        baseUrl: validated.baseUrl || null,
        label: validated.label || null,
        isActive: true,
      },
    })

    return NextResponse.json({
      id: apiKey.id,
      provider: apiKey.provider,
      apiKeyMasked: maskApiKey(validated.apiKey),
      baseUrl: apiKey.baseUrl,
      label: apiKey.label,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt,
    }, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: (err as { errors: unknown[] }).errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to add API key' }, { status: 500 })
  }
}
