/**
 * NOVA Data Sync V2 — Bidirectional sync between Zustand store & Prisma database.
 *
 * Features:
 *  - Truly bidirectional: store → DB and DB → store
 *  - Retry with exponential backoff on transient failures
 *  - Merge-aware: DB wins on first load; subsequent syncs are upserts
 *  - Sync status tracking & reporting
 *  - Feature flag seeding
 *  - AbortController support for cancellation
 *  - Batched operations to reduce round-trips
 */

import { useNovaStore, type Personality } from './nova-store'
import { FEATURE_FLAGS_SEED } from './feature-flags-seed'

// ─── Types ────────────────────────────────────────────────────────────────

export type SyncDirection = 'store-to-db' | 'db-to-store'
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'partial' | 'error'

export interface SyncResult {
  direction: SyncDirection
  status: SyncStatus
  timestamp: Date
  /** Per-entity-type results */
  entities: Record<string, EntitySyncResult>
  errors: SyncError[]
  durationMs: number
}

export interface EntitySyncResult {
  entity: string
  synced: number
  skipped: number
  failed: number
}

export interface SyncError {
  entity: string
  id?: string
  message: string
  retryable: boolean
}

// ─── Config ───────────────────────────────────────────────────────────────

const MAX_RETRIES = 3
const BASE_DELAY_MS = 500
const MAX_DELAY_MS = 8_000
const REQUEST_TIMEOUT_MS = 15_000

// ─── Helpers ──────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function exponentialBackoff(attempt: number): number {
  const jitter = Math.random() * 200
  return Math.min(BASE_DELAY_MS * 2 ** attempt + jitter, MAX_DELAY_MS)
}

/**
 * Fetch wrapper with timeout, retry, and AbortController support.
 */
async function resilientFetch(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
  parentSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  // Link parent abort signal
  const onParentAbort = () => controller.abort()
  parentSignal?.addEventListener('abort', onParentAbort, { once: true })

  try {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        })
        return response
      } catch (err: unknown) {
        const isAbort = err instanceof DOMException && err.name === 'AbortError'
        if (isAbort || attempt === retries) throw err

        await delay(exponentialBackoff(attempt))
      }
    }
    // Unreachable, but satisfies TS
    throw new Error('Max retries exceeded')
  } finally {
    clearTimeout(timeoutId)
    parentSignal?.removeEventListener('abort', onParentAbort)
  }
}

/**
 * Safe JSON fetch that returns null on any failure.
 */
async function safeFetchJson<T>(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
  signal?: AbortSignal,
): Promise<T | null> {
  try {
    const res = await resilientFetch(url, options, retries, signal)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

// ─── Settings mapping ─────────────────────────────────────────────────────

interface SettingMapping {
  storeKey: string
  type: 'boolean' | 'string' | 'number'
  setter: (value: unknown) => void
}

function getSettingMappings(): SettingMapping[] {
  const store = useNovaStore.getState()
  return [
    { storeKey: 'darkMode', type: 'boolean', setter: (v) => store.setDarkMode(v as boolean) },
    { storeKey: 'personality', type: 'string', setter: (v) => store.setPersonality(v as Personality) },
    { storeKey: 'reasoningDepth', type: 'string', setter: (v) => store.setReasoningDepth(v as 'quick' | 'balanced' | 'deep') },
    { storeKey: 'adaptiveLearningEnabled', type: 'boolean', setter: (v) => store.setAdaptiveLearningEnabled(v as boolean) },
    { storeKey: 'smartSuggestionsEnabled', type: 'boolean', setter: (v) => store.setSmartSuggestionsEnabled(v as boolean) },
    { storeKey: 'ttsEnabled', type: 'boolean', setter: (v) => store.setTtsEnabled(v as boolean) },
    { storeKey: 'ttsRate', type: 'number', setter: (v) => store.setTtsRate(Number(v)) },
    { storeKey: 'ttsVoice', type: 'string', setter: (v) => store.setTtsVoice(String(v)) },
    { storeKey: 'showConfidence', type: 'boolean', setter: (v) => store.setShowConfidence(v as boolean) },
    { storeKey: 'autoLearnFromChat', type: 'boolean', setter: (v) => store.setAutoLearnFromChat(v as boolean) },
    { storeKey: 'encryption', type: 'boolean', setter: (v) => store.setEncryption(v as boolean) },
    { storeKey: 'debugMode', type: 'boolean', setter: (v) => store.setDebugMode(v as boolean) },
    { storeKey: 'experimentalFeatures', type: 'boolean', setter: (v) => store.setExperimentalFeatures(v as boolean) },
    { storeKey: 'syncEnabled', type: 'boolean', setter: (v) => store.setSyncEnabled(v as boolean) },
    { storeKey: 'selectedTheme', type: 'string', setter: (v) => store.setSelectedTheme(String(v)) },
    { storeKey: 'dataProcessing', type: 'boolean', setter: (v) => store.setDataProcessing(v as boolean) },
  ]
}

function coerceSetting(raw: string, type: 'boolean' | 'string' | 'number'): unknown {
  switch (type) {
    case 'boolean': return raw === 'true'
    case 'number': return Number(raw)
    case 'string': return raw
  }
}

// ─── Store → Database sync ────────────────────────────────────────────────

/**
 * Push the current Zustand store state into the database.
 *
 * Strategy: upsert every entity — create if missing, update if present.
 * Settings are batched into a single request.
 */
export async function syncStoreToDatabase(
  signal?: AbortSignal,
): Promise<SyncResult> {
  const start = Date.now()
  const state = useNovaStore.getState()
  const errors: SyncError[] = []
  const entities: Record<string, EntitySyncResult> = {}

  // ── Tasks ─────────────────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const promises = state.tasks.map(task =>
      resilientFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
      }, MAX_RETRIES, signal)
        .then(res => { if (res.ok) { synced++ } else { failed++ } })
        .catch(() => { failed++ })
    )
    await Promise.allSettled(promises)
    entities['tasks'] = { entity: 'tasks', synced, skipped, failed }
  }

  // ── Notes ─────────────────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const promises = state.notes.map(note =>
      resilientFetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(note),
      }, MAX_RETRIES, signal)
        .then(res => { if (res.ok) { synced++ } else { failed++ } })
        .catch(() => { failed++ })
    )
    await Promise.allSettled(promises)
    entities['notes'] = { entity: 'notes', synced, skipped, failed }
  }

  // ── Knowledge Entries ─────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const promises = state.knowledgeEntries.map(entry =>
      resilientFetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      }, MAX_RETRIES, signal)
        .then(res => { if (res.ok) { synced++ } else { failed++ } })
        .catch(() => { failed++ })
    )
    await Promise.allSettled(promises)
    entities['knowledge'] = { entity: 'knowledge', synced, skipped, failed }
  }

  // ── Calendar Events ───────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const promises = state.calendarEvents.map(event =>
      resilientFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }, MAX_RETRIES, signal)
        .then(res => { if (res.ok) { synced++ } else { failed++ } })
        .catch(() => { failed++ })
    )
    await Promise.allSettled(promises)
    entities['events'] = { entity: 'events', synced, skipped, failed }
  }

  // ── Automations ───────────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const promises = state.automations.map(auto =>
      resilientFetch('/api/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auto),
      }, MAX_RETRIES, signal)
        .then(res => { if (res.ok) { synced++ } else { failed++ } })
        .catch(() => { failed++ })
    )
    await Promise.allSettled(promises)
    entities['automations'] = { entity: 'automations', synced, skipped, failed }
  }

  // ── Passwords ─────────────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const promises = state.passwords.map(pw =>
      resilientFetch('/api/passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pw),
      }, MAX_RETRIES, signal)
        .then(res => { if (res.ok) { synced++ } else { failed++ } })
        .catch(() => { failed++ })
    )
    await Promise.allSettled(promises)
    entities['passwords'] = { entity: 'passwords', synced, skipped, failed }
  }

  // ── Feature Flags ─────────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    if (state.featureFlags.length > 0) {
      try {
        const res = await resilientFetch('/api/features', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state.featureFlags),
        }, MAX_RETRIES, signal)
        if (res.ok) {
          synced = state.featureFlags.length
        } else {
          failed = state.featureFlags.length
          errors.push({ entity: 'featureFlags', message: `HTTP ${res.status}`, retryable: res.status >= 500 })
        }
      } catch {
        failed = state.featureFlags.length
        errors.push({ entity: 'featureFlags', message: 'Network error', retryable: true })
      }
    } else {
      skipped = 1
    }
    entities['featureFlags'] = { entity: 'featureFlags', synced, skipped, failed }
  }

  // ── Settings (batched) ────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const settingsToSync: Record<string, string> = {
      darkMode: String(state.darkMode),
      personality: state.personality,
      reasoningDepth: state.reasoningDepth,
      adaptiveLearningEnabled: String(state.adaptiveLearningEnabled),
      smartSuggestionsEnabled: String(state.smartSuggestionsEnabled),
      ttsEnabled: String(state.ttsEnabled),
      ttsRate: String(state.ttsRate),
      ttsVoice: state.ttsVoice,
      showConfidence: String(state.showConfidence),
      autoLearnFromChat: String(state.autoLearnFromChat),
      encryption: String(state.encryption),
      debugMode: String(state.debugMode),
      experimentalFeatures: String(state.experimentalFeatures),
      syncEnabled: String(state.syncEnabled),
      selectedTheme: state.selectedTheme,
      dataProcessing: String(state.dataProcessing),
    }
    try {
      const res = await resilientFetch('/api/settings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsToSync }),
      }, MAX_RETRIES, signal)
      if (res.ok) {
        synced = Object.keys(settingsToSync).length
      } else {
        failed = Object.keys(settingsToSync).length
        errors.push({ entity: 'settings', message: `HTTP ${res.status}`, retryable: res.status >= 500 })
      }
    } catch {
      failed = Object.keys(settingsToSync).length
      errors.push({ entity: 'settings', message: 'Network error', retryable: true })
    }
    entities['settings'] = { entity: 'settings', synced, skipped, failed }
  }

  // Determine overall status
  const totalFailed = Object.values(entities).reduce((s, e) => s + e.failed, 0)
  const totalSynced = Object.values(entities).reduce((s, e) => s + e.synced, 0)
  const status: SyncStatus = totalFailed === 0 ? 'success' : totalSynced > 0 ? 'partial' : 'error'

  return {
    direction: 'store-to-db',
    status,
    timestamp: new Date(),
    entities,
    errors,
    durationMs: Date.now() - start,
  }
}

// ─── Database → Store sync ────────────────────────────────────────────────

/**
 * Pull database state into the Zustand store.
 *
 * Merge strategy:
 *  - Entities: DB data replaces store only when the store collection is empty
 *    (first-load / fresh-session scenario). When both have data, we merge by ID
 *    — DB entries that don't exist in the store are added; existing entries are
 *    left as-is to avoid overwriting in-memory edits.
 *  - Settings: DB values always win (they are the source of truth for
 *    configuration).
 *  - Feature flags: DB always wins (flags are managed server-side).
 */
export async function syncDatabaseToStore(
  signal?: AbortSignal,
  force = false,
): Promise<SyncResult> {
  const start = Date.now()
  const store = useNovaStore.getState()
  const errors: SyncError[] = []
  const entities: Record<string, EntitySyncResult> = {}

  // ── Tasks ─────────────────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const data = await safeFetchJson<any[]>('/api/tasks', {}, MAX_RETRIES, signal)
    if (data && Array.isArray(data)) {
      if (force || store.tasks.length === 0) {
        // Replace store with DB data
        const tasks = data.map(normalizeTask)
        tasks.forEach(t => store.addTask(t))
        synced = tasks.length
      } else {
        // Merge: add DB tasks that don't exist in store
        const storeIds = new Set(store.tasks.map(t => t.id))
        for (const raw of data) {
          const task = normalizeTask(raw)
          if (!storeIds.has(task.id)) {
            store.addTask(task)
            synced++
          } else {
            skipped++
          }
        }
      }
    } else if (data === null) {
      failed = 1
      errors.push({ entity: 'tasks', message: 'Failed to fetch', retryable: true })
    }
    entities['tasks'] = { entity: 'tasks', synced, skipped, failed }
  }

  // ── Notes ─────────────────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const data = await safeFetchJson<any[]>('/api/notes', {}, MAX_RETRIES, signal)
    if (data && Array.isArray(data)) {
      if (force || store.notes.length === 0) {
        const notes = data.map(normalizeNote)
        notes.forEach(n => store.addNote(n))
        synced = notes.length
      } else {
        const storeIds = new Set(store.notes.map(n => n.id))
        for (const raw of data) {
          const note = normalizeNote(raw)
          if (!storeIds.has(note.id)) {
            store.addNote(note)
            synced++
          } else {
            skipped++
          }
        }
      }
    } else if (data === null) {
      failed = 1
      errors.push({ entity: 'notes', message: 'Failed to fetch', retryable: true })
    }
    entities['notes'] = { entity: 'notes', synced, skipped, failed }
  }

  // ── Knowledge Entries ─────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const data = await safeFetchJson<any[]>('/api/knowledge', {}, MAX_RETRIES, signal)
    if (data && Array.isArray(data)) {
      if (force || store.knowledgeEntries.length === 0) {
        const entries = data.map(normalizeKnowledge)
        entries.forEach(e => store.addKnowledge(e))
        synced = entries.length
      } else {
        const storeIds = new Set(store.knowledgeEntries.map(e => e.id))
        for (const raw of data) {
          const entry = normalizeKnowledge(raw)
          if (!storeIds.has(entry.id)) {
            store.addKnowledge(entry)
            synced++
          } else {
            skipped++
          }
        }
      }
    } else if (data === null) {
      failed = 1
      errors.push({ entity: 'knowledge', message: 'Failed to fetch', retryable: true })
    }
    entities['knowledge'] = { entity: 'knowledge', synced, skipped, failed }
  }

  // ── Calendar Events ───────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const data = await safeFetchJson<any[]>('/api/events', {}, MAX_RETRIES, signal)
    if (data && Array.isArray(data)) {
      if (force || store.calendarEvents.length === 0) {
        const events = data.map(normalizeEvent)
        events.forEach(e => store.addEvent(e))
        synced = events.length
      } else {
        const storeIds = new Set(store.calendarEvents.map(e => e.id))
        for (const raw of data) {
          const event = normalizeEvent(raw)
          if (!storeIds.has(event.id)) {
            store.addEvent(event)
            synced++
          } else {
            skipped++
          }
        }
      }
    } else if (data === null) {
      failed = 1
      errors.push({ entity: 'events', message: 'Failed to fetch', retryable: true })
    }
    entities['events'] = { entity: 'events', synced, skipped, failed }
  }

  // ── Automations ───────────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const data = await safeFetchJson<any[]>('/api/automations', {}, MAX_RETRIES, signal)
    if (data && Array.isArray(data)) {
      if (force || store.automations.length === 0) {
        const autos = data.map(normalizeAutomation)
        autos.forEach(a => store.addAutomation(a))
        synced = autos.length
      } else {
        const storeIds = new Set(store.automations.map(a => a.id))
        for (const raw of data) {
          const auto = normalizeAutomation(raw)
          if (!storeIds.has(auto.id)) {
            store.addAutomation(auto)
            synced++
          } else {
            skipped++
          }
        }
      }
    } else if (data === null) {
      failed = 1
      errors.push({ entity: 'automations', message: 'Failed to fetch', retryable: true })
    }
    entities['automations'] = { entity: 'automations', synced, skipped, failed }
  }

  // ── Passwords ─────────────────────────────────
  {
    let synced = 0, skipped = 0, failed = 0
    const data = await safeFetchJson<any[]>('/api/passwords', {}, MAX_RETRIES, signal)
    if (data && Array.isArray(data)) {
      if (force || store.passwords.length === 0) {
        const pws = data.map(normalizePassword)
        pws.forEach(p => store.addPassword(p))
        synced = pws.length
      } else {
        const storeIds = new Set(store.passwords.map(p => p.id))
        for (const raw of data) {
          const pw = normalizePassword(raw)
          if (!storeIds.has(pw.id)) {
            store.addPassword(pw)
            synced++
          } else {
            skipped++
          }
        }
      }
    } else if (data === null) {
      failed = 1
      errors.push({ entity: 'passwords', message: 'Failed to fetch', retryable: true })
    }
    entities['passwords'] = { entity: 'passwords', synced, skipped, failed }
  }

  // ── Settings (always apply from DB) ───────────
  {
    let synced = 0, skipped = 0, failed = 0
    const data = await safeFetchJson<Record<string, string>>('/api/settings', {}, MAX_RETRIES, signal)
    if (data && typeof data === 'object') {
      const mappings = getSettingMappings()
      for (const mapping of mappings) {
        const raw = data[mapping.storeKey]
        if (raw !== undefined && raw !== null) {
          try {
            const value = coerceSetting(String(raw), mapping.type)
            mapping.setter(value)
            synced++
          } catch {
            skipped++
          }
        } else {
          skipped++
        }
      }
    } else if (data === null) {
      failed = 1
      errors.push({ entity: 'settings', message: 'Failed to fetch', retryable: true })
    }
    entities['settings'] = { entity: 'settings', synced, skipped, failed }
  }

  // ── Feature Flags (always apply from DB) ──────
  {
    let synced = 0, skipped = 0, failed = 0
    const data = await safeFetchJson<any>('/api/features', {}, MAX_RETRIES, signal)
    if (data) {
      const flags = Array.isArray(data) ? data : (data.flags && Array.isArray(data.flags)) ? data.flags : null
      if (flags) {
        store.setFeatureFlags(flags.map(normalizeFeatureFlag))
        synced = flags.length
      } else {
        skipped = 1
      }
    } else {
      failed = 1
      errors.push({ entity: 'featureFlags', message: 'Failed to fetch', retryable: true })
    }
    entities['featureFlags'] = { entity: 'featureFlags', synced, skipped, failed }
  }

  const totalFailed = Object.values(entities).reduce((s, e) => s + e.failed, 0)
  const totalSynced = Object.values(entities).reduce((s, e) => s + e.synced, 0)
  const status: SyncStatus = totalFailed === 0 ? 'success' : totalSynced > 0 ? 'partial' : 'error'

  return {
    direction: 'db-to-store',
    status,
    timestamp: new Date(),
    entities,
    errors,
    durationMs: Date.now() - start,
  }
}

// ─── Feature Flag Seeding ─────────────────────────────────────────────────

/**
 * Ensure feature flags exist in the database.
 * If the DB has no flags (or fewer than the seed set), seed missing ones.
 */
export async function seedFeatureFlags(
  signal?: AbortSignal,
): Promise<{ seeded: number; skipped: number; error?: string }> {
  try {
    const data = await safeFetchJson<any>('/api/features', {}, 1, signal)
    const existing: any[] = data
      ? Array.isArray(data) ? data : (data.flags && Array.isArray(data.flags)) ? data.flags : []
      : []

    const existingKeys = new Set(existing.map((f: any) => f.key))
    const missing = FEATURE_FLAGS_SEED.filter(f => !existingKeys.has(f.key))

    if (missing.length === 0) {
      return { seeded: 0, skipped: existingKeys.size }
    }

    const res = await resilientFetch('/api/features', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(missing),
    }, MAX_RETRIES, signal)

    if (!res.ok) {
      return { seeded: 0, skipped: 0, error: `HTTP ${res.status}` }
    }

    const body = await res.json()
    const created = body?.created ?? body?.features?.length ?? missing.length
    return { seeded: created, skipped: existingKeys.size }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { seeded: 0, skipped: 0, error: message }
  }
}

// ─── Full Bidirectional Sync ──────────────────────────────────────────────

/**
 * Perform a full bidirectional sync:
 *  1. Seed missing feature flags
 *  2. Pull DB → Store (merge)
 *  3. Push Store → DB (upsert)
 *
 * This ensures both sides converge to the same state.
 */
export async function fullBidirectionalSync(
  signal?: AbortSignal,
): Promise<{ seed: Awaited<ReturnType<typeof seedFeatureFlags>>; pull: SyncResult; push: SyncResult }> {
  const seed = await seedFeatureFlags(signal)
  const pull = await syncDatabaseToStore(signal)
  const push = await syncStoreToDatabase(signal)
  return { seed, pull, push }
}

// ─── App Initialization ───────────────────────────────────────────────────

let _initialized = false
let _initPromise: Promise<void> | null = null

/**
 * Initialize the app: seed feature flags + sync DB → store.
 * Safe to call multiple times — only runs once.
 * Optimized: only syncs settings on first load, defers heavy data.
 */
export async function initializeApp(signal?: AbortSignal): Promise<void> {
  if (_initialized) return

  // Deduplicate concurrent calls
  if (_initPromise) {
    await _initPromise
    return
  }

  _initPromise = (async () => {
    try {
      // Only sync settings first (lightweight)
      const settingsData = await safeFetchJson<Record<string, string>>('/api/settings', {}, 1, signal)
      if (settingsData && typeof settingsData === 'object') {
        const mappings = getSettingMappings()
        for (const mapping of mappings) {
          const raw = settingsData[mapping.storeKey]
          if (raw !== undefined && raw !== null) {
            try {
              const value = coerceSetting(String(raw), mapping.type)
              mapping.setter(value)
            } catch {
              // Skip invalid settings
            }
          }
        }
      }

      // Defer heavy sync to next tick
      setTimeout(async () => {
        try {
          await seedFeatureFlags()
          // Only sync DB → store for entities with data (skip empty collections)
          const store = useNovaStore.getState()
          if (store.tasks.length === 0) {
            const tasksData = await safeFetchJson<any[]>('/api/tasks', {}, 1)
            if (tasksData && Array.isArray(tasksData)) {
              tasksData.map(normalizeTask).forEach(t => store.addTask(t))
            }
          }
        } catch {
          // Silently fail deferred sync
        }
      }, 2000)

      _initialized = true
    } catch (error) {
      console.warn('[data-sync-v2] Initialization failed:', error)
      // Allow retry on next call
      _initPromise = null
    }
  })()

  await _initPromise
}

/**
 * Force a re-initialization (e.g. after logout or data reset).
 */
export function resetInitState(): void {
  _initialized = false
  _initPromise = null
}

// ─── Normalizers ──────────────────────────────────────────────────────────
// Convert Prisma/DB row shapes into the store's expected TypeScript shapes.

function normalizeTask(raw: any): import('./nova-store').Task {
  return {
    id: raw.id,
    title: raw.title ?? '',
    description: raw.description ?? '',
    status: raw.status ?? 'todo',
    priority: raw.priority ?? 'medium',
    dueDate: raw.dueDate ?? undefined,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
  }
}

function normalizeNote(raw: any): import('./nova-store').Note {
  return {
    id: raw.id,
    title: raw.title ?? '',
    content: raw.content ?? '',
    category: raw.category ?? 'general',
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
  }
}

function normalizeKnowledge(raw: any): import('./nova-store').KnowledgeEntry {
  let tags: string[] = []
  if (Array.isArray(raw.tags)) {
    tags = raw.tags
  } else if (typeof raw.tags === 'string') {
    try { tags = JSON.parse(raw.tags) } catch { tags = [] }
  }
  return {
    id: raw.id,
    title: raw.title ?? '',
    content: raw.content ?? '',
    category: raw.category ?? 'general',
    tags,
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
    active: raw.active ?? true,
  }
}

function normalizeEvent(raw: any): import('./nova-store').CalendarEvent {
  return {
    id: raw.id,
    title: raw.title ?? '',
    date: raw.date ?? '',
    time: raw.time ?? undefined,
    type: raw.type ?? 'event',
    description: raw.description ?? undefined,
  }
}

function normalizeAutomation(raw: any): import('./nova-store').Automation {
  return {
    id: raw.id,
    name: raw.name ?? '',
    trigger: raw.trigger ?? '',
    action: raw.action ?? '',
    enabled: raw.enabled ?? true,
    lastRun: raw.lastRun ? new Date(raw.lastRun) : undefined,
  }
}

function normalizePassword(raw: any): import('./nova-store').PasswordEntry {
  return {
    id: raw.id,
    name: raw.name ?? '',
    username: raw.username ?? '',
    password: raw.password ?? '',
    url: raw.url ?? undefined,
    category: raw.category ?? 'general',
    createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
  }
}

function normalizeFeatureFlag(raw: any): import('./nova-store').FeatureFlag {
  return {
    id: raw.id,
    key: raw.key ?? '',
    name: raw.name ?? '',
    description: raw.description ?? '',
    category: raw.category ?? 'general',
    enabled: raw.enabled ?? true,
    configurable: raw.configurable ?? true,
    requiresRestart: raw.requiresRestart ?? false,
    sortOrder: raw.sortOrder ?? 0,
  }
}
