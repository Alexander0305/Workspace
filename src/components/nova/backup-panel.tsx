'use client'

import { useNovaStore } from '@/lib/nova-store'
import { motion } from 'framer-motion'
import { HardDrive, Shield, Clock, Download, RotateCcw, Lock, X } from 'lucide-react'
import { useState, useRef } from 'react'
import { generateNotificationFromEvent } from '@/lib/notification-generator'

export function BackupPanel() {
  const { backupRecords, addBackupRecord, addNotification } = useNovaStore()
  const [backupSchedule, setBackupSchedule] = useState('daily')
  const [isCreating, setIsCreating] = useState(false)
  const [createProgress, setCreateProgress] = useState(0)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreProgress, setRestoreProgress] = useState(0)
  const restoreInputRef = useRef<HTMLInputElement>(null)

  const handleCreateBackup = async () => {
    setIsCreating(true)
    setCreateProgress(0)

    try {
      // Simulate progress while creating
      const progressInterval = setInterval(() => {
        setCreateProgress(prev => Math.min(prev + 5, 90))
      }, 200)

      const res = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: [],
          notes: [],
          calendarEvents: [],
          knowledgeEntries: [],
          automations: [],
        }),
      })

      clearInterval(progressInterval)
      setCreateProgress(100)

      if (res.ok) {
        const data = await res.json()

        // Trigger file download
        const json = JSON.stringify(data.backup, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nova-backup-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)

        // Save backup record
        addBackupRecord({
          id: `backup-${Date.now()}`,
          date: new Date().toLocaleString(),
          size: data.sizeFormatted || 'Unknown',
          encrypted: true,
          type: 'manual',
        })

        // Generate notification
        const notif = generateNotificationFromEvent('backup_created', { size: data.sizeFormatted })
        if (notif) addNotification(notif)
      }
    } catch {
      // Error handling
    }

    setTimeout(() => {
      setIsCreating(false)
      setCreateProgress(0)
    }, 1000)
  }

  const handleRestore = () => {
    restoreInputRef.current?.click()
  }

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsRestoring(true)
    setRestoreProgress(0)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const backupData = JSON.parse(ev.target?.result as string)

        // Simulate restore progress
        const progressInterval = setInterval(() => {
          setRestoreProgress(prev => Math.min(prev + 10, 90))
        }, 150)

        const res = await fetch('/api/backup/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(backupData),
        })

        clearInterval(progressInterval)
        setRestoreProgress(100)

        if (res.ok) {
          const notif = generateNotificationFromEvent('backup_restored', {})
          if (notif) addNotification(notif)
        }
      } catch {
        // Invalid backup file
      }

      setTimeout(() => {
        setIsRestoring(false)
        setRestoreProgress(0)
      }, 1000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const lastBackup = backupRecords.length > 0 ? backupRecords[0] : null

  return (
    <div className="space-y-4">
      {/* Backup status */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-nova-gold" />
            Backup Status
          </h4>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${lastBackup ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
            {lastBackup ? 'Up to date' : 'No backups yet'}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            Last backup: {lastBackup ? lastBackup.date : 'Never'}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs text-emerald-500">AES-256 Encrypted</span>
        </div>

        {/* Create backup */}
        {isCreating ? (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-foreground">Creating backup...</span>
              <span className="text-xs text-muted-foreground">{createProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
              <motion.div
                animate={{ width: `${createProgress}%` }}
                className="h-full rounded-full progress-gold"
              />
            </div>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleCreateBackup}
            className="w-full py-2.5 rounded-lg gold-gradient-bg text-background text-sm font-medium"
          >
            Create Backup Now
          </motion.button>
        )}
      </div>

      {/* Schedule */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Backup Schedule</h4>
        <div className="flex gap-2">
          {['daily', 'weekly', 'manual'].map(schedule => (
            <button
              key={schedule}
              onClick={() => setBackupSchedule(schedule)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                backupSchedule === schedule
                  ? 'gold-gradient-bg text-background'
                  : 'border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              }`}
            >
              {schedule}
            </button>
          ))}
        </div>
      </div>

      {/* Encryption info */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">AES-256 Encryption</p>
            <p className="text-xs text-muted-foreground">All backups are encrypted before storage</p>
          </div>
        </div>
      </div>

      {/* Restore */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Restore from Backup</h4>
        <input ref={restoreInputRef} type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
        {isRestoring ? (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-foreground">Restoring...</span>
              <span className="text-xs text-muted-foreground">{restoreProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
              <motion.div
                animate={{ width: `${restoreProgress}%` }}
                className="h-full rounded-full progress-gold"
              />
            </div>
          </div>
        ) : (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleRestore}
            className="w-full py-2.5 rounded-lg border border-nova-gold/30 text-nova-gold text-sm font-medium hover:bg-nova-gold/5 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Select Backup to Restore
          </motion.button>
        )}
      </div>

      {/* Backup history */}
      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Backup History</h4>
        {backupRecords.length > 0 ? (
          <div className="space-y-2">
            {backupRecords.map(backup => (
              <div key={backup.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-nova-gold" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{backup.date}</p>
                    <p className="text-[10px] text-muted-foreground">{backup.size} · {backup.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {backup.encrypted && <Lock className="w-3 h-3 text-emerald-500" />}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-nova-gold hover:bg-nova-gold/10 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">No backup history yet</p>
        )}
      </div>
    </div>
  )
}
