import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  CURATED_INTEGRATIONS,
  detectSourceType,
  parseGitHubUrl,
  fetchGitHubRepoInfo,
  generateFeatureFlagKey,
  type IntegrationTemplate,
} from '@/lib/integration-engine'

// POST: Install an integration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sourceId, sourceUrl, sourceType } = body as {
      sourceId?: string
      sourceUrl?: string
      sourceType?: string
    }

    if (!sourceId && !sourceUrl) {
      return NextResponse.json(
        { error: 'Either sourceId or sourceUrl is required' },
        { status: 400 }
      )
    }

    // Check if already installed
    let existingSource = null

    if (sourceId) {
      // Installing from curated list
      const template = CURATED_INTEGRATIONS.find((t: IntegrationTemplate) => t.id === sourceId)
      if (!template) {
        return NextResponse.json(
          { error: `Integration template '${sourceId}' not found` },
          { status: 404 }
        )
      }

      existingSource = await db.integrationSource.findFirst({
        where: {
          OR: [
            { url: template.sourceUrl },
            { featureFlagKey: generateFeatureFlagKey(template.id) },
          ],
        },
      })

      if (existingSource) {
        return NextResponse.json(
          { error: 'Integration already installed', integration: existingSource },
          { status: 409 }
        )
      }

      // Create integration record
      const featureFlagKey = generateFeatureFlagKey(template.id)
      const integration = await db.integrationSource.create({
        data: {
          name: template.name,
          description: template.description,
          type: template.sourceType,
          url: template.sourceUrl,
          version: 'latest',
          author: template.sourceUrl.includes('github.com')
            ? template.sourceUrl.split('/')[3]
            : 'unknown',
          license: 'Open Source',
          category: template.category,
          status: 'installing',
          config: JSON.stringify({
            tags: template.tags,
            permissions: template.permissions,
            estimatedSize: template.estimatedSize,
            setupInstructions: template.setupInstructions,
          }),
          featureFlagKey,
        },
      })

      // Create corresponding feature flag
      await db.featureFlag.upsert({
        where: { key: featureFlagKey },
        create: {
          key: featureFlagKey,
          name: `${template.name} Integration`,
          description: `Enable ${template.name} integration: ${template.description.slice(0, 100)}`,
          category: 'Integrations',
          enabled: true,
          configurable: true,
          requiresRestart: false,
          sortOrder: 200,
        },
        update: {
          enabled: true,
        },
      })

      // Log the action
      await db.adminLog.create({
        data: {
          action: 'integration_install',
          details: `Installed ${template.name} from ${template.sourceUrl}`,
          userId: 'admin',
        },
      })

      // Simulate installation process (in a real system, this would download/clones the repo)
      // For now, we mark it as installed after a short delay
      setTimeout(async () => {
        try {
          await db.integrationSource.update({
            where: { id: integration.id },
            data: {
              status: 'installed',
              installedAt: new Date(),
            },
          })
        } catch (err) {
          console.error('[Integration Install] Status update error:', err)
        }
      }, 1500)

      return NextResponse.json({
        success: true,
        integration: {
          ...integration,
          featureFlagKey,
        },
      })
    }

    // Installing from custom URL
    if (sourceUrl) {
      const url = sourceUrl.trim()
      const detectedType = (sourceType as string) || detectSourceType(url)

      existingSource = await db.integrationSource.findFirst({
        where: { url },
      })

      if (existingSource) {
        return NextResponse.json(
          { error: 'Integration already installed', integration: existingSource },
          { status: 409 }
        )
      }

      let name = 'Custom Integration'
      let description = `Integration from ${url}`
      let author = 'unknown'
      let license = 'Unknown'
      let category = 'Custom'
      let popularity = 0

      // Fetch info from GitHub if applicable
      if (detectedType === 'github') {
        const parsed = parseGitHubUrl(url)
        if (parsed) {
          const repoInfo = await fetchGitHubRepoInfo(parsed.owner, parsed.repo)
          name = repoInfo.name
          description = repoInfo.description
          author = repoInfo.author
          license = repoInfo.license
          popularity = repoInfo.stars

          // Detect category from topics/language
          if (repoInfo.topics.includes('llm') || repoInfo.topics.includes('ai') || repoInfo.topics.includes('gpt')) {
            category = 'AI Framework'
          } else if (repoInfo.topics.includes('agent') || repoInfo.topics.includes('automation')) {
            category = 'AI Agent'
          } else if (repoInfo.topics.includes('rag') || repoInfo.topics.includes('retrieval')) {
            category = 'RAG'
          } else if (repoInfo.topics.includes('speech') || repoInfo.topics.includes('voice') || repoInfo.topics.includes('tts')) {
            category = 'Speech'
          } else if (repoInfo.topics.includes('stable-diffusion') || repoInfo.topics.includes('image-generation')) {
            category = 'Image Generation'
          } else {
            category = 'Custom'
          }
        }
      }

      const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
      const featureFlagKey = generateFeatureFlagKey(id)

      const integration = await db.integrationSource.create({
        data: {
          id,
          name,
          description,
          type: detectedType,
          url,
          version: 'latest',
          author,
          license,
          category,
          status: 'installing',
          config: JSON.stringify({ popularity }),
          featureFlagKey,
        },
      })

      // Create feature flag
      await db.featureFlag.upsert({
        where: { key: featureFlagKey },
        create: {
          key: featureFlagKey,
          name: `${name} Integration`,
          description: `Enable ${name} integration: ${description.slice(0, 100)}`,
          category: 'Integrations',
          enabled: true,
          configurable: true,
          requiresRestart: false,
          sortOrder: 200,
        },
        update: {
          enabled: true,
        },
      })

      // Log the action
      await db.adminLog.create({
        data: {
          action: 'integration_install_url',
          details: `Installing ${name} from ${url}`,
          userId: 'admin',
        },
      })

      // Simulate installation
      setTimeout(async () => {
        try {
          await db.integrationSource.update({
            where: { id: integration.id },
            data: {
              status: 'installed',
              installedAt: new Date(),
            },
          })
        } catch (err) {
          console.error('[Integration Install] Status update error:', err)
        }
      }, 2000)

      return NextResponse.json({
        success: true,
        integration: {
          ...integration,
          featureFlagKey,
        },
      })
    }

    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Integration Install] Error:', error)
    return NextResponse.json(
      { error: 'Failed to install integration' },
      { status: 500 }
    )
  }
}
