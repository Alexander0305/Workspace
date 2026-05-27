import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin, createAuditLog } from '@/lib/auth'
import { encryptApiKey, maskApiKey, decryptApiKey } from '@/lib/api-key-crypto'

// PUT - Update a global API key (toggle active, change min tier, update key)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin(request)

    const { id } = await params
    const body = await request.json()

    const existing = await db.globalApiKey.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Global API key not found' }, { status: 404 })
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
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive
    }
    if (body.minTier !== undefined) {
      updateData.minTier = body.minTier
    }

    const updated = await db.globalApiKey.update({
      where: { id },
      data: updateData,
    })

    await createAuditLog(user.id, 'global_api_key_updated', request, `Provider: ${updated.provider}`)

    return NextResponse.json({
      id: updated.id,
      provider: updated.provider,
      apiKeyMasked: maskApiKey(decryptApiKey(updated.apiKey)),
      baseUrl: updated.baseUrl,
      isActive: updated.isActive,
      minTier: updated.minTier,
      updatedAt: updated.updatedAt,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update global API key'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE - Delete a global API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin(request)

    const { id } = await params

    const existing = await db.globalApiKey.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Global API key not found' }, { status: 404 })
    }

    await db.globalApiKey.delete({ where: { id } })

    await createAuditLog(user.id, 'global_api_key_deleted', request, `Provider: ${existing.provider}`)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete global API key'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
