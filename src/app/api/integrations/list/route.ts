import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { CURATED_INTEGRATIONS, type IntegrationTemplate } from '@/lib/integration-engine'

export interface IntegrationListItem {
  id: string
  name: string
  description: string
  sourceUrl: string
  sourceType: string
  category: string
  tags: string[]
  permissions: string[]
  estimatedSize: string
  popularity: number
  installed: boolean
  status?: string
  setupInstructions?: string
}

// GET: List all available integrations (curated + user-installed)
export async function GET() {
  try {
    // Get installed integrations from DB
    const installedSources = await db.integrationSource.findMany()

    // Build the curated list with installation status
    const curated: IntegrationListItem[] = CURATED_INTEGRATIONS.map((template: IntegrationTemplate) => {
      const installed = installedSources.find(s => s.url === template.sourceUrl || s.featureFlagKey === `integration.${template.id}`)
      return {
        id: template.id,
        name: template.name,
        description: template.description,
        sourceUrl: template.sourceUrl,
        sourceType: template.sourceType,
        category: template.category,
        tags: template.tags,
        permissions: template.permissions,
        estimatedSize: template.estimatedSize,
        popularity: template.popularity,
        installed: !!installed,
        status: installed?.status,
        setupInstructions: template.setupInstructions,
      }
    })

    // Add custom integrations (uploaded/URL-installed that aren't in curated list)
    const curatedUrls = new Set(CURATED_INTEGRATIONS.map((t: IntegrationTemplate) => t.sourceUrl))
    const custom: IntegrationListItem[] = installedSources
      .filter(s => !curatedUrls.has(s.url))
      .map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        sourceUrl: s.url,
        sourceType: s.type,
        category: s.category,
        tags: [],
        permissions: [],
        estimatedSize: 'Unknown',
        popularity: 0,
        installed: true,
        status: s.status,
      }))

    // Sort curated by popularity (descending)
    curated.sort((a, b) => b.popularity - a.popularity)

    // Get unique categories
    const categories = [...new Set([
      ...CURATED_INTEGRATIONS.map((t: IntegrationTemplate) => t.category),
      ...installedSources.map(s => s.category),
    ])].sort()

    return NextResponse.json({
      integrations: [...curated, ...custom],
      categories,
      totalCurated: CURATED_INTEGRATIONS.length,
      totalInstalled: installedSources.length,
    })
  } catch (error) {
    console.error('[Integrations List] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    )
  }
}
