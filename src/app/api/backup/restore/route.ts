import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface BackupData {
  version: string
  timestamp: string
  conversations?: Array<{
    id: string
    title: string
    personality: string
    createdAt: string
    updatedAt: string
    messages?: Array<{
      id: string
      conversationId: string
      role: string
      content: string
      thinking?: string
      timestamp: string
    }>
  }>
  knowledgeEntries?: Array<{
    id: string
    title: string
    content: string
    category: string
    tags: string
    createdAt: string
    updatedAt: string
  }>
  tasks?: Array<{
    id: string
    title: string
    description: string
    status: string
    priority: string
    dueDate?: string
    createdAt: string
    updatedAt: string
  }>
  calendarEvents?: Array<{
    id: string
    title: string
    date: string
    time?: string
    type: string
    description?: string
    createdAt: string
  }>
  notes?: Array<{
    id: string
    title: string
    content: string
    category: string
    createdAt: string
    updatedAt: string
  }>
  settings?: Array<{ id: string; key: string; value: string }>
  passwords?: Array<{
    id: string
    name: string
    username: string
    password: string
    url?: string
    category: string
    createdAt: string
  }>
  automations?: Array<{
    id: string
    name: string
    trigger: string
    action: string
    enabled: boolean
    lastRun?: string
  }>
  notifications?: Array<{
    id: string
    title: string
    message: string
    type: string
    read: boolean
    createdAt: string
  }>
  plugins?: Array<{
    id: string
    name: string
    description: string
    icon: string
    category: string
    version: string
    author: string
    installed: boolean
    config: string
    createdAt: string
    updatedAt: string
  }>
  updateQueue?: Array<{
    id: string
    component: string
    description: string
    riskLevel: string
    status: string
    diff?: string
    createdAt: string
  }>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { backupData } = body

    if (!backupData) {
      return NextResponse.json(
        { error: 'No backup data provided' },
        { status: 400 }
      )
    }

    let parsed: BackupData
    try {
      const jsonString = Buffer.from(backupData, 'base64').toString('utf-8')
      parsed = JSON.parse(jsonString) as BackupData
    } catch {
      return NextResponse.json(
        { error: 'Invalid backup data format' },
        { status: 400 }
      )
    }

    if (!parsed.version || !parsed.timestamp) {
      return NextResponse.json(
        { error: 'Invalid backup structure' },
        { status: 400 }
      )
    }

    const restored: Record<string, number> = {
      conversations: 0,
      messages: 0,
      knowledgeEntries: 0,
      tasks: 0,
      calendarEvents: 0,
      notes: 0,
      settings: 0,
      passwords: 0,
      automations: 0,
      notifications: 0,
      plugins: 0,
      updateQueue: 0,
    }

    // Restore conversations and messages
    if (parsed.conversations && Array.isArray(parsed.conversations)) {
      for (const conv of parsed.conversations) {
        await db.conversation.upsert({
          where: { id: conv.id },
          update: {
            title: conv.title,
            personality: conv.personality,
          },
          create: {
            id: conv.id,
            title: conv.title,
            personality: conv.personality,
            createdAt: new Date(conv.createdAt),
            updatedAt: new Date(conv.updatedAt),
          },
        })
        restored.conversations++

        if (conv.messages && Array.isArray(conv.messages)) {
          for (const msg of conv.messages) {
            await db.message.upsert({
              where: { id: msg.id },
              update: {
                content: msg.content,
                thinking: msg.thinking,
              },
              create: {
                id: msg.id,
                conversationId: conv.id,
                role: msg.role,
                content: msg.content,
                thinking: msg.thinking,
                timestamp: new Date(msg.timestamp),
              },
            })
            restored.messages++
          }
        }
      }
    }

    // Restore knowledge entries
    if (parsed.knowledgeEntries && Array.isArray(parsed.knowledgeEntries)) {
      for (const entry of parsed.knowledgeEntries) {
        await db.knowledgeEntry.upsert({
          where: { id: entry.id },
          update: {
            title: entry.title,
            content: entry.content,
            category: entry.category,
            tags: entry.tags,
          },
          create: {
            id: entry.id,
            title: entry.title,
            content: entry.content,
            category: entry.category,
            tags: entry.tags,
            createdAt: new Date(entry.createdAt),
            updatedAt: new Date(entry.updatedAt),
          },
        })
        restored.knowledgeEntries++
      }
    }

    // Restore tasks
    if (parsed.tasks && Array.isArray(parsed.tasks)) {
      for (const task of parsed.tasks) {
        await db.task.upsert({
          where: { id: task.id },
          update: {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
          },
          create: {
            id: task.id,
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            createdAt: new Date(task.createdAt),
          },
        })
        restored.tasks++
      }
    }

    // Restore calendar events
    if (parsed.calendarEvents && Array.isArray(parsed.calendarEvents)) {
      for (const event of parsed.calendarEvents) {
        await db.calendarEvent.upsert({
          where: { id: event.id },
          update: {
            title: event.title,
            date: event.date,
            time: event.time,
            type: event.type,
            description: event.description,
          },
          create: {
            id: event.id,
            title: event.title,
            date: event.date,
            time: event.time,
            type: event.type,
            description: event.description,
            createdAt: new Date(event.createdAt),
          },
        })
        restored.calendarEvents++
      }
    }

    // Restore notes
    if (parsed.notes && Array.isArray(parsed.notes)) {
      for (const note of parsed.notes) {
        await db.note.upsert({
          where: { id: note.id },
          update: {
            title: note.title,
            content: note.content,
            category: note.category,
          },
          create: {
            id: note.id,
            title: note.title,
            content: note.content,
            category: note.category,
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
          },
        })
        restored.notes++
      }
    }

    // Restore settings
    if (parsed.settings && Array.isArray(parsed.settings)) {
      for (const setting of parsed.settings) {
        await db.setting.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: { key: setting.key, value: setting.value },
        })
        restored.settings++
      }
    }

    // Restore passwords
    if (parsed.passwords && Array.isArray(parsed.passwords)) {
      for (const pw of parsed.passwords) {
        await db.passwordEntry.upsert({
          where: { id: pw.id },
          update: {
            name: pw.name,
            username: pw.username,
            password: pw.password,
            url: pw.url,
            category: pw.category,
          },
          create: {
            id: pw.id,
            name: pw.name,
            username: pw.username,
            password: pw.password,
            url: pw.url,
            category: pw.category,
            createdAt: new Date(pw.createdAt),
          },
        })
        restored.passwords++
      }
    }

    // Restore automations
    if (parsed.automations && Array.isArray(parsed.automations)) {
      for (const auto of parsed.automations) {
        await db.automation.upsert({
          where: { id: auto.id },
          update: {
            name: auto.name,
            trigger: auto.trigger,
            action: auto.action,
            enabled: auto.enabled,
            lastRun: auto.lastRun ? new Date(auto.lastRun) : null,
          },
          create: {
            id: auto.id,
            name: auto.name,
            trigger: auto.trigger,
            action: auto.action,
            enabled: auto.enabled,
            lastRun: auto.lastRun ? new Date(auto.lastRun) : null,
          },
        })
        restored.automations++
      }
    }

    // Restore notifications
    if (parsed.notifications && Array.isArray(parsed.notifications)) {
      for (const notif of parsed.notifications) {
        await db.notification.upsert({
          where: { id: notif.id },
          update: {
            title: notif.title,
            message: notif.message,
            type: notif.type,
            read: notif.read,
          },
          create: {
            id: notif.id,
            title: notif.title,
            message: notif.message,
            type: notif.type,
            read: notif.read,
            createdAt: new Date(notif.createdAt),
          },
        })
        restored.notifications++
      }
    }

    // Restore plugins
    if (parsed.plugins && Array.isArray(parsed.plugins)) {
      for (const plugin of parsed.plugins) {
        await db.plugin.upsert({
          where: { id: plugin.id },
          update: {
            name: plugin.name,
            description: plugin.description,
            icon: plugin.icon,
            category: plugin.category,
            version: plugin.version,
            author: plugin.author,
            installed: plugin.installed,
            config: plugin.config,
          },
          create: {
            id: plugin.id,
            name: plugin.name,
            description: plugin.description,
            icon: plugin.icon,
            category: plugin.category,
            version: plugin.version,
            author: plugin.author,
            installed: plugin.installed,
            config: plugin.config,
            createdAt: new Date(plugin.createdAt),
            updatedAt: new Date(plugin.updatedAt),
          },
        })
        restored.plugins++
      }
    }

    // Restore update queue
    if (parsed.updateQueue && Array.isArray(parsed.updateQueue)) {
      for (const update of parsed.updateQueue) {
        await db.updateQueue.upsert({
          where: { id: update.id },
          update: {
            component: update.component,
            description: update.description,
            riskLevel: update.riskLevel,
            status: update.status,
            diff: update.diff,
          },
          create: {
            id: update.id,
            component: update.component,
            description: update.description,
            riskLevel: update.riskLevel,
            status: update.status,
            diff: update.diff,
            createdAt: new Date(update.createdAt),
          },
        })
        restored.updateQueue++
      }
    }

    return NextResponse.json({
      success: true,
      restored,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to restore backup' },
      { status: 500 }
    )
  }
}
