import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all integrations
export async function GET() {
  try {
    // Read integrations from settings or return default list
    const settings = await db.setting.findMany({
      where: { key: { startsWith: 'integration_' } },
    })

    const defaultIntegrations = [
      { id: 'openclaw', name: 'OpenClaw', description: 'Productivity suite integration', status: 'connected', lastSync: new Date().toISOString(), icon: 'Zap', category: 'productivity' },
      { id: 'github', name: 'GitHub', description: 'Code repository access', status: 'connected', lastSync: new Date(Date.now() - 3600000).toISOString(), icon: 'Server', category: 'development' },
      { id: 'slack', name: 'Slack', description: 'Team communication', status: 'disconnected', lastSync: null, icon: 'Users', category: 'communication' },
      { id: 'binance', name: 'Binance', description: 'Crypto exchange trading', status: 'disconnected', lastSync: null, icon: 'Activity', category: 'finance' },
      { id: 'aws-s3', name: 'AWS S3', description: 'Cloud storage & backup', status: 'error', lastSync: new Date(Date.now() - 86400000).toISOString(), icon: 'HardDrive', category: 'storage' },
      { id: 'twitter', name: 'Twitter/X', description: 'Social media management', status: 'connected', lastSync: new Date(Date.now() - 1800000).toISOString(), icon: 'Share2', category: 'social' },
    ]

    // Override status from persisted settings if available
    const integrations = defaultIntegrations.map(int => {
      const setting = settings.find(s => s.key === `integration_${int.id}`)
      if (setting) {
        try {
          const config = JSON.parse(setting.value)
          return { ...int, ...config }
        } catch {
          return int
        }
      }
      return int
    })

    return NextResponse.json({ integrations })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    )
  }
}

// PUT - Update integration status
export async function PUT(request: NextRequest) {
  try {
    const { id, status } = await request.json()

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Integration ID and status are required' },
        { status: 400 }
      )
    }

    // Upsert the integration setting
    await db.setting.upsert({
      where: { key: `integration_${id}` },
      update: { value: JSON.stringify({ status, lastSync: status === 'connected' ? new Date().toISOString() : null }) },
      create: { key: `integration_${id}`, value: JSON.stringify({ status, lastSync: status === 'connected' ? new Date().toISOString() : null }) },
    })

    // Log the action
    await db.adminLog.create({
      data: {
        action: 'integration_toggle',
        details: `${id}: ${status}`,
        userId: 'admin',
      },
    })

    return NextResponse.json({ success: true, id, status })
  } catch {
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    )
  }
}
