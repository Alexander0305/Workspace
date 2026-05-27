import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const [
      conversations,
      messages,
      knowledge,
      plugins,
      settings,
      backups,
      updateQueue,
      tasks,
      calendarEvents,
      notes,
      passwordEntries,
      automations,
      notifications,
      featureFlags,
      adminLogs,
    ] = await Promise.all([
      db.conversation.count(),
      db.message.count(),
      db.knowledgeEntry.count(),
      db.plugin.count(),
      db.setting.count(),
      db.backup.count(),
      db.updateQueue.count(),
      db.task.count(),
      db.calendarEvent.count(),
      db.note.count(),
      db.passwordEntry.count(),
      db.automation.count(),
      db.notification.count(),
      db.featureFlag.count(),
      db.adminLog.count(),
    ])

    const tables = [
      { name: 'Conversations', count: conversations },
      { name: 'Messages', count: messages },
      { name: 'Knowledge', count: knowledge },
      { name: 'Plugins', count: plugins },
      { name: 'Settings', count: settings },
      { name: 'Backups', count: backups },
      { name: 'Update Queue', count: updateQueue },
      { name: 'Tasks', count: tasks },
      { name: 'Calendar Events', count: calendarEvents },
      { name: 'Notes', count: notes },
      { name: 'Passwords', count: passwordEntries },
      { name: 'Automations', count: automations },
      { name: 'Notifications', count: notifications },
      { name: 'Feature Flags', count: featureFlags },
      { name: 'Admin Logs', count: adminLogs },
    ]

    const totalRecords = tables.reduce((sum, t) => sum + t.count, 0)

    // Get DB file size
    let dbSize = '0 KB'
    try {
      const dbPath = path.join(process.cwd(), 'db', 'custom.db')
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath)
        const bytes = stats.size
        if (bytes >= 1073741824) dbSize = (bytes / 1073741824).toFixed(2) + ' GB'
        else if (bytes >= 1048576) dbSize = (bytes / 1048576).toFixed(2) + ' MB'
        else if (bytes >= 1024) dbSize = (bytes / 1024).toFixed(2) + ' KB'
        else dbSize = bytes + ' B'
      }
    } catch {
      // Ignore
    }

    return NextResponse.json({ tables, totalRecords, dbSize })
  } catch {
    return NextResponse.json(
      { error: 'Failed to get database stats' },
      { status: 500 }
    )
  }
}
