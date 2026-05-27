import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser, createAuditLog } from '@/lib/auth'
import { encryptApiKey, maskApiKey, decryptApiKey } from '@/lib/api-key-crypto'

// PUT - Update an API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify the key belongs to this user
    const existing = await db.userApiKey.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (body.apiKey) {
      updateData.apiKey = encryptApiKey(body.apiKey)
    }
    if (body.apiSecret !== undefined) {
      updateData.apiSecret = body.apiSecret ? encryptApiKey(body.apiSecret) : null
    }
    if (body.baseUrl !== undefined) {
      updateData.baseUrl = body.baseUrl || null
    }
    if (body.label !== undefined) {
      updateData.label = body.label || null
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive
    }

    const updated = await db.userApiKey.update({
      where: { id },
      data: updateData,
    })

    await createAuditLog(user.id, 'api_key_updated', request, `Provider: ${updated.provider}`)

    return NextResponse.json({
      id: updated.id,
      provider: updated.provider,
      apiKeyMasked: maskApiKey(decryptApiKey(updated.apiKey)),
      baseUrl: updated.baseUrl,
      label: updated.label,
      isActive: updated.isActive,
      updatedAt: updated.updatedAt,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 })
  }
}

// DELETE - Delete an API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    // Verify the key belongs to this user
    const existing = await db.userApiKey.findFirst({
      where: { id, userId: user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    await db.userApiKey.delete({ where: { id } })

    await createAuditLog(user.id, 'api_key_deleted', request, `Provider: ${existing.provider}`)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
  }
}
