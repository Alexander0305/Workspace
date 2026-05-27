import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CURATED_INTEGRATIONS, type IntegrationTemplate } from '@/lib/integration-engine'

// GET: Get integration details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check curated integrations first
    const template = CURATED_INTEGRATIONS.find((t: IntegrationTemplate) => t.id === id)
    const installed = await db.integrationSource.findFirst({
      where: {
        OR: [
          { id },
          { featureFlagKey: `integration.${id}` },
        ],
      },
    })

    if (template) {
      return NextResponse.json({
        ...template,
        installed: !!installed,
        status: installed?.status || 'not_installed',
        installedAt: installed?.installedAt,
        error: installed?.error,
        dbId: installed?.id,
      })
    }

    if (installed) {
      return NextResponse.json({
        id: installed.id,
        name: installed.name,
        description: installed.description,
        sourceUrl: installed.url,
        sourceType: installed.type,
        category: installed.category,
        tags: [],
        permissions: [],
        estimatedSize: 'Unknown',
        popularity: 0,
        installed: true,
        status: installed.status,
        installedAt: installed.installedAt,
        error: installed.error,
        version: installed.version,
        author: installed.author,
        license: installed.license,
        config: JSON.parse(installed.config || '{}'),
        featureFlagKey: installed.featureFlagKey,
      })
    }

    return NextResponse.json(
      { error: 'Integration not found' },
      { status: 404 }
    )
  } catch (error) {
    console.error('[Integration Get] Error:', error)
    return NextResponse.json(
      { error: 'Failed to get integration' },
      { status: 500 }
    )
  }
}

// DELETE: Uninstall an integration
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Find the integration
    const integration = await db.integrationSource.findFirst({
      where: {
        OR: [
          { id },
          { featureFlagKey: `integration.${id}` },
        ],
      },
    })

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Disable the feature flag if it exists
    if (integration.featureFlagKey) {
      await db.featureFlag.updateMany({
        where: { key: integration.featureFlagKey },
        data: { enabled: false },
      })
    }

    // Delete the integration record
    await db.integrationSource.delete({
      where: { id: integration.id },
    })

    // Log the action
    await db.adminLog.create({
      data: {
        action: 'integration_uninstall',
        details: `Uninstalled ${integration.name} (${integration.url})`,
        userId: 'admin',
      },
    })

    return NextResponse.json({
      success: true,
      message: `Integration '${integration.name}' uninstalled successfully`,
    })
  } catch (error) {
    console.error('[Integration Delete] Error:', error)
    return NextResponse.json(
      { error: 'Failed to uninstall integration' },
      { status: 500 }
    )
  }
}

// PATCH: Update integration status (enable/disable)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status } = body as { status?: string }

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    const integration = await db.integrationSource.findFirst({
      where: {
        OR: [
          { id },
          { featureFlagKey: `integration.${id}` },
        ],
      },
    })

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Update the integration status
    const updated = await db.integrationSource.update({
      where: { id: integration.id },
      data: { status },
    })

    // Update the feature flag
    if (integration.featureFlagKey) {
      await db.featureFlag.updateMany({
        where: { key: integration.featureFlagKey },
        data: { enabled: status === 'installed' },
      })
    }

    return NextResponse.json({
      success: true,
      integration: updated,
    })
  } catch (error) {
    console.error('[Integration Patch] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    )
  }
}
