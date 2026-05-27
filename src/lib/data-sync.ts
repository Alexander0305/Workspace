import type {
  Task,
  CalendarEvent,
  Note,
  PasswordEntry,
  Automation,
  Notification,
  Conversation,
  KnowledgeEntry,
} from './nova-store'

interface SyncData {
  tasks?: Task[]
  calendarEvents?: CalendarEvent[]
  notes?: Note[]
  passwords?: PasswordEntry[]
  automations?: Automation[]
  notifications?: Notification[]
  conversations?: Conversation[]
  knowledgeEntries?: KnowledgeEntry[]
  settings?: Record<string, string>
}

/**
 * Sync local store state to the database via API calls.
 * This is called from the client side.
 */
export async function syncToDatabase(data: SyncData): Promise<void> {
  const syncPromises: Promise<void>[] = []

  // Sync tasks
  if (data.tasks) {
    for (const task of data.tasks) {
      syncPromises.push(
        fetch('/api/tasks', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task),
        }).then(() => {}).catch(() => {})
      )
    }
  }

  // Sync calendar events
  if (data.calendarEvents) {
    for (const event of data.calendarEvents) {
      syncPromises.push(
        fetch(`/api/events/${event.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        }).then(() => {}).catch(() => {})
      )
    }
  }

  // Sync notes
  if (data.notes) {
    for (const note of data.notes) {
      syncPromises.push(
        fetch(`/api/notes/${note.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(note),
        }).then(() => {}).catch(() => {})
      )
    }
  }

  // Sync knowledge entries
  if (data.knowledgeEntries) {
    for (const entry of data.knowledgeEntries) {
      syncPromises.push(
        fetch(`/api/knowledge/${entry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        }).then(() => {}).catch(() => {})
      )
    }
  }

  // Sync settings
  if (data.settings) {
    syncPromises.push(
      fetch('/api/settings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: data.settings }),
      }).then(() => {}).catch(() => {})
    )
  }

  await Promise.allSettled(syncPromises)
}

/**
 * Load all data from the database.
 * This is called on the client side to initialize the store.
 */
export async function syncFromDatabase(): Promise<SyncData> {
  const data: SyncData = {}

  try {
    const [
      tasksRes,
      eventsRes,
      notesRes,
      passwordsRes,
      automationsRes,
      notificationsRes,
      conversationsRes,
      knowledgeRes,
      settingsRes,
    ] = await Promise.allSettled([
      fetch('/api/tasks'),
      fetch('/api/events'),
      fetch('/api/notes'),
      fetch('/api/passwords'),
      fetch('/api/automations'),
      fetch('/api/notifications'),
      fetch('/api/conversations'),
      fetch('/api/knowledge'),
      fetch('/api/settings'),
    ])

    if (tasksRes.status === 'fulfilled' && tasksRes.value.ok) {
      data.tasks = await tasksRes.value.json()
    }
    if (eventsRes.status === 'fulfilled' && eventsRes.value.ok) {
      data.calendarEvents = await eventsRes.value.json()
    }
    if (notesRes.status === 'fulfilled' && notesRes.value.ok) {
      data.notes = await notesRes.value.json()
    }
    if (passwordsRes.status === 'fulfilled' && passwordsRes.value.ok) {
      data.passwords = await passwordsRes.value.json()
    }
    if (automationsRes.status === 'fulfilled' && automationsRes.value.ok) {
      data.automations = await automationsRes.value.json()
    }
    if (notificationsRes.status === 'fulfilled' && notificationsRes.value.ok) {
      data.notifications = await notificationsRes.value.json()
    }
    if (conversationsRes.status === 'fulfilled' && conversationsRes.value.ok) {
      data.conversations = await conversationsRes.value.json()
    }
    if (knowledgeRes.status === 'fulfilled' && knowledgeRes.value.ok) {
      data.knowledgeEntries = await knowledgeRes.value.json()
    }
    if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
      data.settings = await settingsRes.value.json()
    }
  } catch {
    // Return whatever data we have
  }

  return data
}

/**
 * Initialize the store from the database on app startup.
 * Call this once when the app loads.
 */
export async function initStoreFromDB(): Promise<SyncData> {
  return syncFromDatabase()
}
