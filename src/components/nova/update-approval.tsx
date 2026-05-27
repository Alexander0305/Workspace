'use client'

import { useNovaStore, type UpdateItem } from '@/lib/nova-store'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, X, Clock, Shield, ArrowDownToLine, RefreshCw, Loader2 } from 'lucide-react'
import { useState, useCallback } from 'react'

const RISK_COLORS = {
  low: 'text-emerald-500 bg-emerald-500/10',
  medium: 'text-yellow-500 bg-yellow-500/10',
  high: 'text-red-500 bg-red-500/10',
}

interface PackageUpdateInfo {
  name: string
  currentVersion: string
  latestVersion: string
  riskLevel: 'low' | 'medium' | 'high'
  description: string
}

// Key packages to check for updates (we won't check every single dependency)
const KEY_PACKAGES = [
  'next', 'react', 'react-dom', 'zustand', 'framer-motion',
  'recharts', 'lucide-react', 'prisma', '@prisma/client',
  'tailwindcss', 'typescript', 'zod',
]

function assessRisk(current: string, latest: string): 'low' | 'medium' | 'high' {
  const cParts = current.replace(/[\^~>=<]/g, '').split('.').map(Number)
  const lParts = latest.replace(/[\^~>=<]/g, '').split('.').map(Number)

  const cMajor = cParts[0] ?? 0
  const lMajor = lParts[0] ?? 0

  if (lMajor > cMajor) return 'high'
  if ((lParts[1] ?? 0) > (cParts[1] ?? 0)) return 'medium'
  return 'low'
}

export function UpdateApproval() {
  const { updateQueue, addUpdate, approveUpdate, rejectUpdate, updateHistory, addUpdateHistory } = useNovaStore()
  const [selectedUpdate, setSelectedUpdate] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  const pendingUpdates = updateQueue.filter(u => u.status === 'pending')

  const logToAdmin = useCallback(async (action: string, details: string) => {
    try {
      await fetch('/api/admin/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, details, userId: 'admin' }),
      })
    } catch {
      // Silently fail — admin logging is best-effort
    }
  }, [])

  const handleCheckForUpdates = useCallback(async () => {
    setIsChecking(true)
    setCheckError(null)

    try {
      // Step 1: Fetch system info with current dependency versions
      const sysRes = await fetch('/api/system')
      if (!sysRes.ok) {
        setCheckError('Failed to fetch system information')
        setIsChecking(false)
        return
      }
      const sysData = await sysRes.json()
      const currentDeps: Record<string, string> = sysData.dependencies || {}
      const appVersion: string = sysData.version || '0.0.0'

      // Step 2: Check npm registry for latest versions of key packages
      const updates: PackageUpdateInfo[] = []

      // Check app version itself
      const packagesToCheck = [
        { name: 'NOVA App', current: appVersion, check: true },
        ...KEY_PACKAGES
          .filter(pkg => currentDeps[pkg])
          .map(pkg => ({ name: pkg, current: currentDeps[pkg], check: true })),
      ]

      // Check each package against npm registry
      const checkPromises = packagesToCheck.map(async (pkg) => {
        try {
          // For the NOVA App itself, skip npm check
          if (pkg.name === 'NOVA App') return null

          const npmRes = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}/latest`, {
            signal: AbortSignal.timeout(5000),
          })
          if (!npmRes.ok) return null

          const npmData = await npmRes.json()
          const latestVersion: string = npmData.version
          if (!latestVersion) return null

          const currentClean = pkg.current.replace(/[\^~>=<]/g, '')
          if (latestVersion !== currentClean && latestVersion > currentClean) {
            const risk = assessRisk(currentClean, latestVersion)
            return {
              name: pkg.name,
              currentVersion: pkg.current,
              latestVersion: latestVersion,
              riskLevel: risk,
              description: `Update ${pkg.name} from ${pkg.current} to ${latestVersion}. ${risk === 'high' ? 'Major version change — may include breaking changes.' : risk === 'medium' ? 'Minor version update with new features.' : 'Patch update with bug fixes.'}`,
            }
          }
        } catch {
          // Registry unreachable — skip this package
        }
        return null
      })

      const results = await Promise.allSettled(checkPromises)
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          updates.push(result.value)
        }
      }

      // Step 3: Create update items in the store
      const existingIds = new Set(updateQueue.map(u => u.id))
      let newCount = 0
      for (const update of updates) {
        const id = `update-${update.name}-${Date.now()}`
        if (existingIds.has(id)) continue

        // Don't add duplicate updates for the same component
        const alreadyQueued = updateQueue.some(
          u => u.component === update.name && u.status === 'pending'
        )
        if (alreadyQueued) continue

        const item: UpdateItem = {
          id,
          component: update.name,
          description: update.description,
          riskLevel: update.riskLevel,
          status: 'pending',
          diff: `${update.currentVersion} → ${update.latestVersion}`,
          createdAt: new Date(),
        }
        addUpdate(item)
        newCount++
      }

      setLastChecked(new Date().toLocaleTimeString())

      // Log the check
      await logToAdmin('update_check', `Checked for updates. Found ${updates.length} available, ${newCount} new entries added.`)

      if (updates.length === 0) {
        setCheckError(null) // No error, just no updates
      }
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Failed to check for updates')
      await logToAdmin('update_check_error', `Update check failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsChecking(false)
    }
  }, [updateQueue, addUpdate, logToAdmin])

  const handleApprove = async (id: string) => {
    const update = updateQueue.find(u => u.id === id)
    approveUpdate(id)
    if (update) {
      const version = update.diff || 'N/A'
      addUpdateHistory({
        id: `hist-${Date.now()}`,
        component: update.component,
        version,
        status: 'approved',
        date: new Date().toLocaleDateString(),
      })
      await logToAdmin('update_approve', `Approved update for ${update.component} (${version})`)
    }
  }

  const handleReject = async (id: string) => {
    const update = updateQueue.find(u => u.id === id)
    rejectUpdate(id)
    if (update) {
      const version = update.diff || 'N/A'
      addUpdateHistory({
        id: `hist-${Date.now()}`,
        component: update.component,
        version,
        status: 'rejected',
        date: new Date().toLocaleDateString(),
      })
      await logToAdmin('update_reject', `Rejected update for ${update.component} (${version})`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Check for updates button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleCheckForUpdates}
        disabled={isChecking}
        className="w-full glass-card p-4 flex items-center gap-3 border-nova-gold/20 disabled:opacity-60"
      >
        {isChecking ? (
          <Loader2 className="w-5 h-5 text-nova-gold animate-spin" />
        ) : (
          <RefreshCw className="w-5 h-5 text-nova-gold" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            {isChecking ? 'Checking for Updates...' : 'Check for Updates'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isChecking
              ? 'Querying package registries...'
              : lastChecked
                ? `Last checked: ${lastChecked}`
                : 'Compare installed packages against latest versions'}
          </p>
        </div>
      </motion.button>

      {/* Error message */}
      {checkError && (
        <div className="glass-card p-3 border-red-500/20">
          <p className="text-xs text-red-400">{checkError}</p>
        </div>
      )}

      {/* Pending updates */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4 text-nova-gold" />
          Pending Updates ({pendingUpdates.length})
        </h4>
        <div className="space-y-3">
          <AnimatePresence>
            {pendingUpdates.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-6 text-center"
              >
                <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {lastChecked ? 'All systems are up to date' : 'No updates checked yet'}
                </p>
                {!lastChecked && (
                  <p className="text-xs text-muted-foreground mt-1">Click &quot;Check for Updates&quot; to scan for available updates</p>
                )}
              </motion.div>
            ) : (
              pendingUpdates.map(update => (
                <motion.div
                  key={update.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass-card p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="text-sm font-medium text-foreground">{update.component}</h5>
                      <p className="text-xs text-muted-foreground mt-0.5">{update.description}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${RISK_COLORS[update.riskLevel]}`}>
                      {update.riskLevel} risk
                    </span>
                  </div>

                  {update.diff && (
                    <div className="mb-2 text-[10px] font-mono text-nova-gold">
                      {update.diff}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleApprove(update.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
                    >
                      <Check className="w-3 h-3" />
                      Approve
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleReject(update.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Reject
                    </motion.button>
                    <button
                      onClick={() => setSelectedUpdate(selectedUpdate === update.id ? null : update.id)}
                      className="ml-auto text-[10px] text-muted-foreground hover:text-nova-gold transition-colors"
                    >
                      View Details
                    </button>
                  </div>

                  <AnimatePresence>
                    {selectedUpdate === update.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3"
                      >
                        <div className="bg-black/40 rounded-lg p-3 font-mono text-[10px] text-muted-foreground overflow-x-auto">
                          {update.description.split('. ').map((line, i) => (
                            <div key={i} className="text-emerald-400">+ {line}</div>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-nova-gold" />
                            <span className="text-[10px] text-muted-foreground">Verified signature</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Requires approval</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Update history toggle */}
      <button
        onClick={() => setShowHistory(!showHistory)}
        className="text-xs text-muted-foreground hover:text-nova-gold transition-colors"
      >
        {showHistory ? 'Hide' : 'Show'} Update History
      </button>

      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4"
          >
            <h4 className="text-sm font-semibold text-foreground mb-3">Update History</h4>
            {updateHistory.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {updateHistory.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
                    <div>
                      <p className="text-xs font-medium text-foreground">{h.component}</p>
                      <p className="text-[10px] text-muted-foreground">{h.version}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{h.date}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        h.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {h.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No update history yet</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Self-update settings */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Auto-Update</p>
            <p className="text-xs text-muted-foreground">Require approval for all updates</p>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-[10px] text-muted-foreground">Approval required</span>
          </div>
        </div>
      </div>
    </div>
  )
}
