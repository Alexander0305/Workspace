'use client'

import { useNovaStore, type PasswordEntry } from '@/lib/nova-store'
import { encryptData, decryptData, verifyPassword, hashPassword } from '@/lib/encryption'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Unlock, Eye, EyeOff, Copy, Plus, Trash2, Search, Shield, Key, X, RefreshCw, ShieldCheck, ShieldAlert } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'

function generateSecurePassword(length: number = 20): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, n => chars[n % chars.length]).join('')
}

function calculateSecurityScore(password: string): number {
  let score = 0
  if (password.length >= 8) score += 20
  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 10
  if (/[A-Z]/.test(password)) score += 10
  if (/[a-z]/.test(password)) score += 10
  if (/[0-9]/.test(password)) score += 10
  if (/[^a-zA-Z0-9]/.test(password)) score += 15
  if (password.length >= 20) score += 15
  return Math.min(score, 100)
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Check if a string looks like base64-encoded AES-GCM data (salt(16)+iv(12)+ciphertext) */
function isLikelyEncrypted(value: string): boolean {
  // Encrypted data is base64 and will be much longer than plaintext for short passwords
  // It contains at least 28 bytes (salt+iv) + some ciphertext, so base64 will be at least ~40 chars
  // We also check that it's valid base64
  if (value.length < 40) return false
  try {
    const decoded = atob(value)
    return decoded.length >= 28
  } catch {
    return false
  }
}

const SCORE_COLORS: Record<string, string> = {
  low: 'text-red-400',
  medium: 'text-nova-gold',
  high: 'text-emerald-500',
}

const SCORE_BG: Record<string, string> = {
  low: 'bg-red-400/10',
  medium: 'bg-nova-gold/10',
  high: 'bg-emerald-500/10',
}

function getScoreLevel(score: number): 'low' | 'medium' | 'high' {
  if (score < 40) return 'low'
  if (score < 70) return 'medium'
  return 'high'
}

const CATEGORIES = ['All', 'Development', 'Cloud', 'Design', 'Social', 'Finance', 'General']

export function PasswordVaultView() {
  const {
    passwords, addPassword, updatePassword, deletePassword, visiblePasswordIds, togglePasswordVisibility,
    vaultLocked, setVaultLocked, masterPasswordHash, setMasterPasswordHash,
  } = useNovaStore()

  const [masterPassword, setMasterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newCategory, setNewCategory] = useState('General')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isReencrypting, setIsReencrypting] = useState(false)

  // Cached master password ref — not persisted, cleared on lock
  const masterPasswordRef = useRef<string>('')

  // Decrypted password cache — maps entry.id -> decrypted plaintext
  const [decryptedPasswords, setDecryptedPasswords] = useState<Record<string, string>>({})

  // Auto-lock after 5 minutes of inactivity
  const autoLockTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetAutoLock = useCallback(() => {
    if (autoLockTimer.current) clearTimeout(autoLockTimer.current)
    if (!vaultLocked) {
      autoLockTimer.current = setTimeout(() => {
        handleLockVault()
      }, 5 * 60 * 1000) // 5 minutes
    }
  }, [vaultLocked])

  useEffect(() => {
    if (!vaultLocked) {
      resetAutoLock()
    }
    return () => {
      if (autoLockTimer.current) clearTimeout(autoLockTimer.current)
    }
  }, [vaultLocked, resetAutoLock])

  // Decrypt all passwords when vault is unlocked or passwords change
  useEffect(() => {
    if (vaultLocked || !masterPasswordRef.current) return

    const decryptAll = async () => {
      const newDecrypted: Record<string, string> = {}
      for (const entry of passwords) {
        if (isLikelyEncrypted(entry.password)) {
          try {
            newDecrypted[entry.id] = await decryptData(entry.password, masterPasswordRef.current)
          } catch {
            newDecrypted[entry.id] = entry.password // Show raw if decryption fails
          }
        } else {
          newDecrypted[entry.id] = entry.password
        }
      }
      setDecryptedPasswords(newDecrypted)
    }

    decryptAll()
  }, [vaultLocked, passwords])

  const isFirstUnlock = !masterPasswordHash && vaultLocked

  const filtered = passwords.filter(p => {
    const matchCat = selectedCategory === 'All' || p.category === selectedCategory
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.username.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch
  })

  const getDisplayPassword = (entry: PasswordEntry): string => {
    return decryptedPasswords[entry.id] ?? entry.password
  }

  const avgScore = passwords.length > 0
    ? Math.round(passwords.reduce((acc, p) => acc + calculateSecurityScore(getDisplayPassword(p)), 0) / passwords.length)
    : 0

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text)
    if (success) {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const handleAdd = async () => {
    if (!newName.trim() || !newUsername.trim() || !newPassword.trim()) return
    const mp = masterPasswordRef.current
    const encryptedPwd = mp ? await encryptData(newPassword.trim(), mp) : newPassword.trim()
    const entry: PasswordEntry = {
      id: `p-${Date.now()}`,
      name: newName.trim(),
      username: newUsername.trim(),
      password: encryptedPwd,
      url: newUrl.trim() || undefined,
      category: newCategory,
      createdAt: new Date(),
    }
    addPassword(entry)
    setNewName('')
    setNewUsername('')
    setNewPassword('')
    setNewUrl('')
    setNewCategory('General')
    setShowAddDialog(false)
    resetAutoLock()
  }

  const handleUnlock = async () => {
    if (!masterPassword) return

    if (isFirstUnlock) {
      if (masterPassword !== confirmPassword) {
        setUnlockError('Passwords do not match')
        return
      }
      if (masterPassword.length < 4) {
        setUnlockError('Password must be at least 4 characters')
        return
      }
      const hash = await hashPassword(masterPassword)
      setMasterPasswordHash(hash)
      masterPasswordRef.current = masterPassword
      setVaultLocked(false)
      setMasterPassword('')
      setConfirmPassword('')
      setUnlockError('')
    } else {
      if (!masterPasswordHash) return
      const isValid = await verifyPassword(masterPassword, masterPasswordHash)
      if (isValid) {
        masterPasswordRef.current = masterPassword
        setVaultLocked(false)
        setMasterPassword('')
        setUnlockError('')
      } else {
        setUnlockError('Incorrect password')
      }
    }
  }

  const handleLockVault = () => {
    masterPasswordRef.current = ''
    setDecryptedPasswords({})
    setVaultLocked(true)
    useNovaStore.getState().addNotification({
      id: `not-vault-${Date.now()}`,
      title: 'Vault Locked',
      message: 'Password vault has been locked for security.',
      type: 'info',
      read: false,
      createdAt: new Date(),
    })
  }

  const handleDelete = (id: string) => {
    if (deleteConfirmId === id) {
      deletePassword(id)
      setDeleteConfirmId(null)
    } else {
      setDeleteConfirmId(id)
      setTimeout(() => setDeleteConfirmId(null), 3000)
    }
  }

  const handleReencryptAll = async () => {
    const mp = masterPasswordRef.current
    if (!mp) return
    setIsReencrypting(true)
    try {
      for (const entry of passwords) {
        const currentPassword = decryptedPasswords[entry.id] ?? entry.password
        const newEncrypted = await encryptData(currentPassword, mp)
        updatePassword(entry.id, { password: newEncrypted })
      }
      useNovaStore.getState().addNotification({
        id: `not-reencrypt-${Date.now()}`,
        title: 'Re-encryption Complete',
        message: `All ${passwords.length} passwords have been re-encrypted.`,
        type: 'success',
        read: false,
        createdAt: new Date(),
      })
    } catch {
      useNovaStore.getState().addNotification({
        id: `not-reencrypt-err-${Date.now()}`,
        title: 'Re-encryption Failed',
        message: 'An error occurred while re-encrypting passwords.',
        type: 'error',
        read: false,
        createdAt: new Date(),
      })
    } finally {
      setIsReencrypting(false)
    }
  }

  // Locked state
  if (vaultLocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 text-center max-w-sm w-full"
        >
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 rounded-2xl bg-nova-gold/10 flex items-center justify-center mx-auto mb-4 border border-nova-gold/20"
          >
            <Lock className="w-8 h-8 text-nova-gold" />
          </motion.div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {isFirstUnlock ? 'Create Master Password' : 'Vault Locked'}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {isFirstUnlock ? 'Set a master password to secure your vault with AES-256-GCM encryption' : 'Enter your master password to unlock'}
          </p>
          <input
            type="password"
            value={masterPassword}
            onChange={(e) => { setMasterPassword(e.target.value); setUnlockError('') }}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            placeholder="Master password..."
            className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold mb-3"
            autoFocus
          />
          {isFirstUnlock && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setUnlockError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Confirm password..."
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold mb-3"
            />
          )}
          {unlockError && (
            <p className="text-xs text-destructive mb-3">{unlockError}</p>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUnlock}
            className="w-full py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium"
          >
            {isFirstUnlock ? 'Create & Unlock' : 'Unlock'}
          </motion.button>
          <p className="text-[10px] text-muted-foreground mt-3">
            🔒 AES-256-GCM encryption · PBKDF2 key derivation
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 overflow-y-auto" onClick={resetAutoLock}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLockVault}
            className="p-2 rounded-lg bg-nova-gold/10 text-nova-gold"
            title="Lock Vault"
          >
            <Unlock className="w-4 h-4" />
          </motion.button>
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Lock className="w-5 h-5 text-nova-gold" />
              Password Vault
            </h3>
            <p className="text-xs text-muted-foreground">{passwords.length} entries · Security score: {avgScore}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReencryptAll}
            disabled={isReencrypting || passwords.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-nova-gold hover:border-nova-gold/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReencrypting ? 'animate-spin' : ''}`} />
            {isReencrypting ? 'Re-encrypting...' : 'Re-encrypt All'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLockVault}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            Lock Vault
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Password
          </motion.button>
        </div>
      </div>

      {/* Security score */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-nova-gold" />
            <span className="text-sm font-semibold text-foreground">Security Score</span>
          </div>
          <span className={`text-lg font-bold ${SCORE_COLORS[getScoreLevel(avgScore)]}`}>{avgScore}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-secondary/50 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${avgScore}%` }}
            className={`h-full rounded-full ${getScoreLevel(avgScore) === 'high' ? 'bg-emerald-500' : getScoreLevel(avgScore) === 'medium' ? 'bg-nova-gold' : 'bg-red-400'}`}
          />
        </div>
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>AES-256-GCM encryption active · {passwords.filter(p => isLikelyEncrypted(p.password)).length}/{passwords.length} entries encrypted</span>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search passwords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-secondary/30 border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat ? 'gold-gradient-bg text-background' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Password entries */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map(entry => {
            const isVisible = visiblePasswordIds.includes(entry.id)
            const displayPwd = getDisplayPassword(entry)
            const score = calculateSecurityScore(displayPwd)
            const level = getScoreLevel(score)
            const isEncrypted = isLikelyEncrypted(entry.password)
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                whileHover={{ scale: 1.005, y: -1 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center flex-shrink-0">
                      <Key className="w-5 h-5 text-nova-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">{entry.name}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${SCORE_BG[level]} ${SCORE_COLORS[level]}`}>
                          {level}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isEncrypted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {isEncrypted ? <ShieldCheck className="w-2.5 h-2.5" /> : <ShieldAlert className="w-2.5 h-2.5" />}
                          {isEncrypted ? 'Encrypted' : 'Unencrypted'}
                        </span>
                      </div>
                      <div className="mt-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-12">User</span>
                          <span className="text-xs text-foreground font-mono">{entry.username}</span>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleCopy(entry.username, `u-${entry.id}`)} className="p-0.5 text-muted-foreground hover:text-nova-gold">
                            <Copy className="w-3 h-3" />
                          </motion.button>
                          {copiedId === `u-${entry.id}` && <span className="text-[10px] text-emerald-500">Copied!</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-12">Pass</span>
                          <span className="text-xs text-foreground font-mono">
                            {isVisible ? displayPwd : '••••••••'}
                          </span>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => togglePasswordVisibility(entry.id)} className="p-0.5 text-muted-foreground hover:text-nova-gold">
                            {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleCopy(displayPwd, `p-${entry.id}`)} className="p-0.5 text-muted-foreground hover:text-nova-gold">
                            <Copy className="w-3 h-3" />
                          </motion.button>
                          {copiedId === `p-${entry.id}` && <span className="text-[10px] text-emerald-500">Copied!</span>}
                        </div>
                        {entry.url && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground w-12">URL</span>
                            <span className="text-[10px] text-nova-gold truncate">{entry.url}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(entry.id)}
                    className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                      deleteConfirmId === entry.id ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {passwords.length === 0 && (
          <div className="text-center py-8">
            <Lock className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No passwords stored yet. Add your first one!</p>
          </div>
        )}
      </div>

      {/* Add password dialog */}
      <AnimatePresence>
        {showAddDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddDialog(false)}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass-card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Add Password</h3>
                <button onClick={() => setShowAddDialog(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Service name..." className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Username</label>
                  <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username or email..." className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Password</label>
                  <div className="flex gap-2">
                    <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password..." className="flex-1 bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold font-mono" />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setNewPassword(generateSecurePassword())}
                      className="px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:text-nova-gold hover:border-nova-gold/30 transition-colors whitespace-nowrap"
                    >
                      Generate
                    </motion.button>
                  </div>
                  {newPassword && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            getScoreLevel(calculateSecurityScore(newPassword)) === 'high' ? 'bg-emerald-500' :
                            getScoreLevel(calculateSecurityScore(newPassword)) === 'medium' ? 'bg-nova-gold' : 'bg-red-400'
                          }`}
                          style={{ width: `${calculateSecurityScore(newPassword)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] ${SCORE_COLORS[getScoreLevel(calculateSecurityScore(newPassword))]}`}>
                        {calculateSecurityScore(newPassword)}%
                      </span>
                    </div>
                  )}
                  {masterPasswordRef.current && newPassword && (
                    <p className="text-[10px] text-emerald-500 mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Will be encrypted with AES-256-GCM before saving
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">URL (optional)</label>
                  <input type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAdd} className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium">Add Password</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
