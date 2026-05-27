import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { encryptData } from '@/lib/encryption'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      includeConversations = true,
      includeKnowledge = true,
      includeTasks = true,
      includeNotes = true,
      includeSettings = true,
      encrypt = false,
      password,
    } = body

    const backupData: Record<string, unknown> = {
      version: '1.0',
      timestamp: new Date().toISOString(),
    }

    if (includeConversations) {
      backupData.conversations = await db.conversation.findMany({
        include: { messages: true },
      })
    }

    if (includeKnowledge) {
      backupData.knowledgeEntries = await db.knowledgeEntry.findMany()
    }

    if (includeTasks) {
      backupData.tasks = await db.task.findMany()
      backupData.calendarEvents = await db.calendarEvent.findMany()
    }

    if (includeNotes) {
      backupData.notes = await db.note.findMany()
    }

    if (includeSettings) {
      backupData.settings = await db.setting.findMany()
      backupData.passwords = await db.passwordEntry.findMany()
      backupData.automations = await db.automation.findMany()
      backupData.notifications = await db.notification.findMany()
      backupData.plugins = await db.plugin.findMany()
      backupData.updateQueue = await db.updateQueue.findMany()
    }

    const jsonString = JSON.stringify(backupData)
    let finalData: string
    let isActuallyEncrypted = false

    if (encrypt && password && typeof password === 'string' && password.length > 0) {
      // Actually encrypt the backup data using AES-256-GCM
      finalData = await encryptData(jsonString, password)
      isActuallyEncrypted = true
    } else {
      // No encryption — just base64 encode the plain JSON
      finalData = Buffer.from(jsonString).toString('base64')
      isActuallyEncrypted = false
    }

    const sizeInBytes = Buffer.byteLength(finalData)

    function formatSize(bytes: number): string {
      if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'
      if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB'
      if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB'
      return bytes + ' B'
    }

    // Save backup record — encrypted flag now reflects actual encryption status
    await db.backup.create({
      data: {
        size: formatSize(sizeInBytes),
        location: 'local',
        encrypted: isActuallyEncrypted,
      },
    })

    return NextResponse.json({
      backupData: finalData,
      size: formatSize(sizeInBytes),
      timestamp: backupData.timestamp,
      encrypted: isActuallyEncrypted,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    )
  }
}
