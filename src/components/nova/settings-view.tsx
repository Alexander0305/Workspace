'use client'

import { useNovaStore, PERSONALITIES, type Personality, type Integration, type IntegrationType } from '@/lib/nova-store'
import { useAuth } from '@/lib/auth-context'
import { CssCustomizer } from './css-customizer'
import { BackupPanel } from './backup-panel'
import { UpdateApproval } from './update-approval'
import { LlmTraining } from './llm-training'
import { WorkflowPatterns } from './workflow-patterns'
import { motion } from 'framer-motion'
import {
  Palette, UserCircle, Shield, HardDrive, RefreshCw, Mic, Plug, Terminal, RefreshCcw,
  Sun, Moon, Check, Brain, Volume2, Trash2, X, ShieldCheck, Monitor, Smartphone, Lock
} from 'lucide-react'
import { useState, useMemo, useCallback } from 'react'
import { getAvailableVoices } from '@/lib/tts'
import { detectPatterns, detectPreferences, clearLearningData, getLearningProgress } from '@/lib/adaptive-learning'

const SETTINGS_TABS = [
  { id: 'appearance', label: 'Appearance', icon: Palette, adminOnly: false },
  { id: 'personality', label: 'Personality', icon: UserCircle, adminOnly: false },
  { id: 'privacy', label: 'Privacy', icon: Shield, adminOnly: false },
  { id: 'backup', label: 'Backup', icon: HardDrive, adminOnly: false },
  { id: 'updates', label: 'Updates', icon: RefreshCw, adminOnly: true },
  { id: 'voice', label: 'Voice', icon: Mic, adminOnly: false },
  { id: 'integrations', label: 'Integrations', icon: Plug, adminOnly: true },
  { id: 'advanced', label: 'Advanced', icon: Terminal, adminOnly: true },
  { id: 'ai-learning', label: 'AI & Learning', icon: Brain, adminOnly: false },
  { id: 'sync', label: 'Sync', icon: RefreshCcw, adminOnly: true },
]

const THEME_PRESETS = [
  { id: 'midnight-gold', name: 'Midnight Gold', colors: ['#0a0a0a', '#d4a574', '#1a1a1a'] },
  { id: 'royal-purple', name: 'Royal Purple', colors: ['#0a0a0a', '#7c3aed', '#1a1a1a'] },
  { id: 'obsidian', name: 'Obsidian', colors: ['#0a0a0a', '#a0a0a0', '#1a1a1a'] },
  { id: 'custom', name: 'Custom', colors: ['#0a0a0a', '#d4a574', '#7c3aed'] },
]

export function SettingsView() {
  const { isAdmin } = useAuth()
  const {
    personality, setPersonality, darkMode, setDarkMode, customCSS, setCustomCSS,
    reasoningDepth, setReasoningDepth,
    adaptiveLearningEnabled, setAdaptiveLearningEnabled,
    smartSuggestionsEnabled, setSmartSuggestionsEnabled,
    autoLearnFromChat, setAutoLearnFromChat,
    showConfidence, setShowConfidence,
    ttsEnabled, setTtsEnabled,
    ttsRate, setTtsRate,
    ttsVoice, setTtsVoice,
    setWorkflowPatterns, setDetectedPreferences,
    // Persisted settings from store
    dataProcessing, setDataProcessing,
    encryption, setEncryption,
    debugMode, setDebugMode,
    experimentalFeatures, setExperimentalFeatures,
    syncEnabled, setSyncEnabled,
    selectedTheme, setSelectedTheme,
    // Integrations
    integrations, updateIntegration,
    // Devices
    devices, addDevice,
    // Navigation
    setActiveView,
    // Delete all data
    deleteAllData,
  } = useNovaStore()

  const [activeTab, setActiveTab] = useState('appearance')
  const [clearConfirm, setClearConfirm] = useState(false)
  const [confidenceThreshold, setConfidenceThreshold] = useState(50)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showIntegrationDialog, setShowIntegrationDialog] = useState<string | null>(null)
  const [integrationCredentials, setIntegrationCredentials] = useState<Record<string, string>>({})
  const [integrationSuccess, setIntegrationSuccess] = useState<string | null>(null)

  // Detect current device from user agent
  const currentDeviceName = useMemo(() => {
    if (typeof window === 'undefined') return 'This Device'
    const ua = navigator.userAgent
    if (/iPhone/.test(ua)) return 'iPhone'
    if (/iPad/.test(ua)) return 'iPad'
    if (/Android/.test(ua)) return 'Android Device'
    if (/Macintosh/.test(ua)) return 'Mac'
    if (/Windows/.test(ua)) return 'Windows PC'
    if (/Linux/.test(ua)) return 'Linux PC'
    return 'This Device'
  }, [])

  // All connected devices: current device + registered devices from store
  const connectedDevices = useMemo(() => {
    const currentDevice = {
      id: 'current-device',
      name: currentDeviceName,
      lastSync: 'Current session',
      status: 'active' as const,
      isCurrentDevice: true,
    }
    return [currentDevice, ...devices]
  }, [currentDeviceName, devices])

  // Available voices
  const availableVoices = useMemo(() => {
    if (typeof window === 'undefined' || (activeTab !== 'voice' && activeTab !== 'ai-learning')) return []
    return getAvailableVoices().map(v => ({ name: v.name, lang: v.lang }))
  }, [activeTab])

  // Learning data
  const learningProgress = useMemo(() => (activeTab === 'ai-learning' && adaptiveLearningEnabled) ? getLearningProgress() : { patternsLearned: 0, preferencesDetected: 0, personalizationScore: 0 }, [activeTab, adaptiveLearningEnabled])
  const learnedPreferences = useMemo(() => (activeTab === 'ai-learning' && adaptiveLearningEnabled) ? detectPreferences().map(p => ({ key: p.key, value: p.value, confidence: p.confidence })) : [], [activeTab, adaptiveLearningEnabled])

  useMemo(() => {
    if (activeTab === 'ai-learning' && adaptiveLearningEnabled) {
      setWorkflowPatterns(detectPatterns())
      setDetectedPreferences(detectPreferences())
    }
    return undefined
  }, [activeTab, adaptiveLearningEnabled, setWorkflowPatterns, setDetectedPreferences])

  // Integration dialog field definitions per type
  const integrationFields: Record<IntegrationType, Array<{ key: string; label: string; placeholder: string; type?: string }>> = useMemo(() => ({
    github: [
      { key: 'username', label: 'GitHub Username', placeholder: 'e.g. octocat' },
      { key: 'token', label: 'Personal Access Token', placeholder: 'ghp_xxxxxxxxxxxx', type: 'password' },
    ],
    twitter: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Enter your Twitter API key' },
      { key: 'apiSecret', label: 'API Secret', placeholder: 'Enter your API secret', type: 'password' },
    ],
    binance: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Enter your Binance API key' },
      { key: 'secret', label: 'API Secret', placeholder: 'Enter your API secret', type: 'password' },
    ],
    banking: [
      { key: 'institution', label: 'Institution Name', placeholder: 'e.g. Chase, Wells Fargo' },
      { key: 'accountType', label: 'Account Type', placeholder: 'e.g. Checking, Savings' },
    ],
    slack: [
      { key: 'workspace', label: 'Workspace URL', placeholder: 'e.g. myteam.slack.com' },
      { key: 'token', label: 'Bot Token', placeholder: 'xoxb-xxxxxxx', type: 'password' },
    ],
    openclaw: [
      { key: 'email', label: 'Email', placeholder: 'your@email.com' },
      { key: 'token', label: 'Access Token', placeholder: 'Enter your access token', type: 'password' },
    ],
  }), [])

  const activeIntegration = useMemo(() => {
    if (!showIntegrationDialog) return null
    return integrations.find(i => i.name === showIntegrationDialog) ?? null
  }, [showIntegrationDialog, integrations])

  // Reset credentials when dialog opens
  const handleOpenIntegrationDialog = useCallback((name: string) => {
    setShowIntegrationDialog(name)
    setIntegrationSuccess(null)
    const int = integrations.find(i => i.name === name)
    if (int) {
      setIntegrationCredentials(int.credentials ?? {})
    } else {
      setIntegrationCredentials({})
    }
  }, [integrations])

  const handleConnectIntegration = useCallback(() => {
    if (!activeIntegration) return
    updateIntegration(activeIntegration.id, {
      connected: true,
      credentials: { ...integrationCredentials },
    })
    setIntegrationSuccess(activeIntegration.name)
    setTimeout(() => {
      setShowIntegrationDialog(null)
      setIntegrationSuccess(null)
    }, 1500)
  }, [activeIntegration, integrationCredentials, updateIntegration])

  const handleDisconnectIntegration = useCallback((id: string) => {
    updateIntegration(id, { connected: false, credentials: {} })
  }, [updateIntegration])

  const handleClearLearningData = () => {
    if (clearConfirm) {
      clearLearningData()
      setClearConfirm(false)
      setWorkflowPatterns([])
      setDetectedPreferences([])
    } else {
      setClearConfirm(true)
      setTimeout(() => setClearConfirm(false), 3000)
    }
  }

  const handleDeleteAllData = () => {
    if (showDeleteConfirm) {
      deleteAllData()
    } else {
      setShowDeleteConfirm(true)
      setTimeout(() => setShowDeleteConfirm(false), 5000)
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Theme</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {THEME_PRESETS.map(preset => (
                  <motion.button
                    key={preset.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedTheme(preset.id)}
                    className={`glass-card p-4 text-center transition-colors ${
                      selectedTheme === preset.id ? 'border-nova-gold/50 gold-glow' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-2">
                      {preset.colors.map((color, i) => (
                        <div key={i} className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <p className="text-xs font-medium text-foreground">{preset.name}</p>
                    {selectedTheme === preset.id && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mt-1">
                        <Check className="w-3 h-3 text-nova-gold mx-auto" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 glass-card">
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="w-5 h-5 text-nova-gold" /> : <Sun className="w-5 h-5 text-nova-gold" />}
                <div>
                  <p className="text-sm font-medium text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Optimized for low-light environments</p>
                </div>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-nova-gold' : 'bg-secondary'}`}
              >
                <motion.div
                  animate={{ x: darkMode ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm mt-0.5"
                />
              </button>
            </div>

            <CssCustomizer css={customCSS} onApply={setCustomCSS} />
          </div>
        )

      case 'personality':
        return (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Select Personality</h4>
            {(Object.entries(PERSONALITIES) as [Personality, typeof PERSONALITIES.nova][]).map(([key, p]) => (
              <motion.button
                key={key}
                whileHover={{ scale: 1.01, x: 4 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setPersonality(key)}
                className={`w-full glass-card p-4 flex items-center gap-4 text-left transition-colors ${
                  personality === key ? 'border-nova-gold/50 gold-glow' : ''
                }`}
              >
                <span className="text-2xl">{p.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.description}</p>
                </div>
                {personality === key && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <Check className="w-5 h-5 text-nova-gold" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        )

      case 'privacy':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card">
              <div>
                <p className="text-sm font-medium text-foreground">Data Processing</p>
                <p className="text-xs text-muted-foreground">Allow NOVA to process your data for improved responses</p>
              </div>
              <button
                onClick={() => setDataProcessing(!dataProcessing)}
                className={`w-11 h-6 rounded-full transition-colors ${dataProcessing ? 'bg-nova-gold' : 'bg-secondary'}`}
              >
                <motion.div
                  animate={{ x: dataProcessing ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm mt-0.5"
                />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 glass-card">
              <div>
                <p className="text-sm font-medium text-foreground">End-to-End Encryption</p>
                <p className="text-xs text-muted-foreground">Encrypt all conversations and data at rest</p>
              </div>
              <button
                onClick={() => setEncryption(!encryption)}
                className={`w-11 h-6 rounded-full transition-colors ${encryption ? 'bg-nova-gold' : 'bg-secondary'}`}
              >
                <motion.div
                  animate={{ x: encryption ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm mt-0.5"
                />
              </button>
            </div>
            <div className="p-4 glass-card">
              <p className="text-sm font-medium text-foreground mb-2">Data Deletion</p>
              <p className="text-xs text-muted-foreground mb-3">Permanently delete all your data. This action cannot be undone.</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDeleteAllData}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  showDeleteConfirm
                    ? 'bg-destructive text-destructive-foreground'
                    : 'border border-destructive/30 text-destructive hover:bg-destructive/10'
                }`}
              >
                {showDeleteConfirm ? 'Click again to confirm deletion' : 'Delete All Data'}
              </motion.button>
            </div>
          </div>
        )

      case 'backup':
        return <BackupPanel />

      case 'updates':
        return <UpdateApproval />

      case 'voice':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-nova-gold" />
                <div>
                  <p className="text-sm font-medium text-foreground">Text-to-Speech</p>
                  <p className="text-xs text-muted-foreground">Enable NOVA to speak responses aloud</p>
                </div>
              </div>
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`w-11 h-6 rounded-full transition-colors ${ttsEnabled ? 'bg-nova-gold' : 'bg-secondary'}`}
              >
                <motion.div
                  animate={{ x: ttsEnabled ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm mt-0.5"
                />
              </button>
            </div>
            <div className="p-4 glass-card">
              <label className="text-xs text-muted-foreground mb-1.5 block">Speech Rate: {ttsRate.toFixed(1)}x</label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={ttsRate}
                onChange={(e) => setTtsRate(Number(e.target.value))}
                className="w-full accent-nova-gold"
              />
            </div>
            <div className="p-4 glass-card">
              <label className="text-xs text-muted-foreground mb-1.5 block">Voice</label>
              <select
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold"
              >
                <option value="">Default Voice</option>
                {availableVoices.slice(0, 20).map((v, i) => (
                  <option key={i} value={v.name}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'integrations':
        return (
          <div className="space-y-3">
            {integrations.length === 0 ? (
              <div className="p-8 glass-card text-center">
                <Plug className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No integrations available</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Connect services to unlock powerful features</p>
              </div>
            ) : (
              integrations.map(int => (
                <div key={int.id} className="flex items-center justify-between p-4 glass-card">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${int.connected ? 'bg-nova-gold/10' : 'bg-secondary/30'}`}>
                      {int.connected ? (
                        <ShieldCheck className="w-4 h-4 text-nova-gold" />
                      ) : (
                        <Plug className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{int.name}</p>
                      <p className="text-xs text-muted-foreground">{int.description}</p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => int.connected ? handleDisconnectIntegration(int.id) : handleOpenIntegrationDialog(int.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                      int.connected
                        ? 'gold-gradient-bg text-background'
                        : 'border border-border text-muted-foreground hover:text-nova-gold hover:border-nova-gold/30'
                    }`}
                  >
                    {int.connected ? 'Disconnect' : 'Connect'}
                  </motion.button>
                </div>
              ))
            )}

            {/* Integration dialog */}
            {showIntegrationDialog && activeIntegration && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setShowIntegrationDialog(null); setIntegrationSuccess(null) }}
                className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm glass-card p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">{showIntegrationDialog}</h3>
                    <button onClick={() => { setShowIntegrationDialog(null); setIntegrationSuccess(null) }} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {integrationSuccess ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-4"
                    >
                      <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                        <ShieldCheck className="w-7 h-7 text-emerald-500" />
                      </div>
                      <p className="text-sm font-medium text-foreground">{integrationSuccess} Connected!</p>
                      <p className="text-xs text-muted-foreground mt-1">Your integration is now active</p>
                    </motion.div>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground mb-4">
                        Connect your {showIntegrationDialog} account to enable integration features.
                      </p>
                      <div className="space-y-3 mb-4">
                        {(integrationFields[activeIntegration.type] ?? []).map(field => (
                          <div key={field.key}>
                            <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                            <input
                              type={field.type ?? 'text'}
                              value={integrationCredentials[field.key] ?? ''}
                              onChange={(e) => setIntegrationCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold"
                            />
                          </div>
                        ))}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleConnectIntegration}
                        className="w-full py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium"
                      >
                        Connect
                      </motion.button>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </div>
        )

      case 'advanced':
        return (
          <div className="space-y-4">
            <CssCustomizer css={customCSS} onApply={setCustomCSS} />
            <div className="flex items-center justify-between p-4 glass-card">
              <div>
                <p className="text-sm font-medium text-foreground">Experimental Features</p>
                <p className="text-xs text-muted-foreground">Enable features that are still in development</p>
              </div>
              <button
                onClick={() => setExperimentalFeatures(!experimentalFeatures)}
                className={`w-11 h-6 rounded-full transition-colors ${experimentalFeatures ? 'bg-nova-purple' : 'bg-secondary'}`}
              >
                <motion.div
                  animate={{ x: experimentalFeatures ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm mt-0.5"
                />
              </button>
            </div>
            <div className="flex items-center justify-between p-4 glass-card">
              <div>
                <p className="text-sm font-medium text-foreground">Debug Mode</p>
                <p className="text-xs text-muted-foreground">Show verbose logging and system internals</p>
              </div>
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={`w-11 h-6 rounded-full transition-colors ${debugMode ? 'bg-nova-purple' : 'bg-secondary'}`}
              >
                <motion.div
                  animate={{ x: debugMode ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm mt-0.5"
                />
              </button>
            </div>
            <LlmTraining />
          </div>
        )

      case 'ai-learning':
        return (
          <div className="space-y-4">
            <div className="p-4 glass-card">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-nova-gold" />
                <h4 className="text-sm font-semibold text-foreground">Reasoning Depth</h4>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['quick', 'balanced', 'deep'] as const).map(depth => (
                  <motion.button
                    key={depth}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setReasoningDepth(depth)}
                    className={`p-3 rounded-lg text-center transition-colors ${
                      reasoningDepth === depth
                        ? 'gold-gradient-bg text-background'
                        : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <p className="text-xs font-medium capitalize">{depth}</p>
                    <p className="text-[10px] mt-0.5 opacity-70">
                      {depth === 'quick' ? 'Fast responses' : depth === 'balanced' ? 'Best of both' : 'Maximum depth'}
                    </p>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 glass-card">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-nova-gold" />
                <div>
                  <p className="text-sm font-medium text-foreground">Adaptive Learning</p>
                  <p className="text-xs text-muted-foreground">Learn from your usage patterns and preferences</p>
                </div>
              </div>
              <button
                onClick={() => setAdaptiveLearningEnabled(!adaptiveLearningEnabled)}
                className={`w-11 h-6 rounded-full transition-colors ${adaptiveLearningEnabled ? 'bg-nova-gold' : 'bg-secondary'}`}
              >
                <motion.div
                  animate={{ x: adaptiveLearningEnabled ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm mt-0.5"
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 glass-card">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-nova-purple" />
                <div>
                  <p className="text-sm font-medium text-foreground">Smart Suggestions</p>
                  <p className="text-xs text-muted-foreground">Show AI-generated suggestions based on your patterns</p>
                </div>
              </div>
              <button
                onClick={() => setSmartSuggestionsEnabled(!smartSuggestionsEnabled)}
                className={`w-11 h-6 rounded-full transition-colors ${smartSuggestionsEnabled ? 'bg-nova-purple' : 'bg-secondary'}`}
              >
                <motion.div
                  animate={{ x: smartSuggestionsEnabled ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm mt-0.5"
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 glass-card">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-nova-gold" />
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-Learn from Chat</p>
                  <p className="text-xs text-muted-foreground">Extract and save knowledge from conversations</p>
                </div>
              </div>
              <button
                onClick={() => setAutoLearnFromChat(!autoLearnFromChat)}
                className={`w-11 h-6 rounded-full transition-colors ${autoLearnFromChat ? 'bg-nova-gold' : 'bg-secondary'}`}
              >
                <motion.div
                  animate={{ x: autoLearnFromChat ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm mt-0.5"
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 glass-card">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">Show Confidence Scores</p>
                  <p className="text-xs text-muted-foreground">Display confidence badges on AI responses</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfidence(!showConfidence)}
                className={`w-11 h-6 rounded-full transition-colors ${showConfidence ? 'bg-nova-gold' : 'bg-secondary'}`}
              >
                <motion.div
                  animate={{ x: showConfidence ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm mt-0.5"
                />
              </button>
            </div>

            <div className="p-4 glass-card">
              <label className="text-xs text-muted-foreground mb-1.5 block">Confidence Threshold: {confidenceThreshold}%</label>
              <p className="text-[10px] text-muted-foreground mb-2">Only show suggestions with confidence above this level</p>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                className="w-full accent-nova-gold"
              />
            </div>

            <div className="p-4 glass-card">
              <div className="flex items-center gap-2 mb-3">
                <Volume2 className="w-4 h-4 text-nova-gold" />
                <h4 className="text-sm font-semibold text-foreground">Text-to-Speech Settings</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Enable TTS</span>
                  <button
                    onClick={() => setTtsEnabled(!ttsEnabled)}
                    className={`w-11 h-6 rounded-full transition-colors ${ttsEnabled ? 'bg-nova-gold' : 'bg-secondary'}`}
                  >
                    <motion.div
                      animate={{ x: ttsEnabled ? 20 : 2 }}
                      className="w-5 h-5 rounded-full bg-white shadow-sm mt-0.5"
                    />
                  </button>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Speech Rate: {ttsRate.toFixed(1)}x</label>
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.1}
                    value={ttsRate}
                    onChange={(e) => setTtsRate(Number(e.target.value))}
                    className="w-full accent-nova-gold"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Voice Selection</label>
                  <select
                    value={ttsVoice}
                    onChange={(e) => setTtsVoice(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold"
                  >
                    <option value="">Default Voice</option>
                    {availableVoices.slice(0, 15).map((v, i) => (
                      <option key={i} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {adaptiveLearningEnabled && (
              <div className="p-4 glass-card">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-nova-gold" />
                  <h4 className="text-sm font-semibold text-foreground">Learning Progress</h4>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-secondary/20 text-center">
                    <p className="text-lg font-bold text-nova-gold">{learningProgress.patternsLearned}</p>
                    <p className="text-[10px] text-muted-foreground">Patterns</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/20 text-center">
                    <p className="text-lg font-bold text-nova-purple">{learningProgress.preferencesDetected}</p>
                    <p className="text-[10px] text-muted-foreground">Preferences</p>
                  </div>
                  <div className="p-3 rounded-lg bg-secondary/20 text-center">
                    <p className="text-lg font-bold text-emerald-500">{learningProgress.personalizationScore}%</p>
                    <p className="text-[10px] text-muted-foreground">Score</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">Personalization</span>
                    <span className="text-[10px] text-nova-gold">{learningProgress.personalizationScore}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
                    <motion.div
                      animate={{ width: `${learningProgress.personalizationScore}%` }}
                      className="h-full rounded-full progress-gold"
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {learnedPreferences.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Detected Preferences</p>
                    {learnedPreferences.map(pref => (
                      <div key={pref.key} className="flex items-center justify-between p-2 rounded-lg bg-secondary/10">
                        <span className="text-xs text-foreground">{pref.key}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-nova-gold">{pref.value}</span>
                          <span className="text-[10px] text-muted-foreground">{Math.round(pref.confidence * 100)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {adaptiveLearningEnabled && (
              <div className="p-4 glass-card">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-nova-gold" />
                  <h4 className="text-sm font-semibold text-foreground">Workflow Patterns</h4>
                </div>
                <WorkflowPatterns />
              </div>
            )}

            <div className="p-4 glass-card">
              <div className="flex items-center gap-2 mb-3">
                <Trash2 className="w-4 h-4 text-destructive" />
                <h4 className="text-sm font-semibold text-foreground">Clear Learning Data</h4>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Remove all learned patterns, preferences, and usage history. This cannot be undone.</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClearLearningData}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                  clearConfirm
                    ? 'bg-destructive text-destructive-foreground'
                    : 'border border-destructive/30 text-destructive hover:bg-destructive/10'
                }`}
              >
                {clearConfirm ? 'Confirm: Click again to delete' : 'Clear All Learning Data'}
              </motion.button>
            </div>
          </div>
        )

      case 'sync':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 glass-card">
              <div>
                <p className="text-sm font-medium text-foreground">Cross-Platform Sync</p>
                <p className="text-xs text-muted-foreground">Sync your data across all devices</p>
              </div>
              <button
                onClick={() => setSyncEnabled(!syncEnabled)}
                className={`w-11 h-6 rounded-full transition-colors ${syncEnabled ? 'bg-nova-gold' : 'bg-secondary'}`}
              >
                <motion.div
                  animate={{ x: syncEnabled ? 20 : 2 }}
                  className="w-5 h-5 rounded-full bg-white shadow-sm mt-0.5"
                />
              </button>
            </div>
            <div className="p-4 glass-card">
              <h4 className="text-sm font-semibold text-foreground mb-3">Connected Devices</h4>
              {syncEnabled ? (
                <div className="space-y-2">
                  {connectedDevices.map(device => (
                    <div key={device.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20">
                      <div className="flex items-center gap-2.5">
                        {device.isCurrentDevice ? (
                          <Monitor className="w-4 h-4 text-nova-gold flex-shrink-0" />
                        ) : (
                          <Smartphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm text-foreground">
                            {device.name}
                            {device.isCurrentDevice && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-nova-gold/10 text-nova-gold font-medium">This device</span>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Last sync: {device.lastSync}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${device.status === 'active' ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
                        <span className="text-[10px] text-muted-foreground capitalize">{device.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-secondary/10 text-center">
                  <RefreshCcw className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Enable Cross-Platform Sync to connect other devices</p>
                </div>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // Filter tabs based on admin access
  const visibleTabs = useMemo(() => SETTINGS_TABS.filter(tab => !tab.adminOnly || isAdmin), [isAdmin])

  return (
    <div className="flex flex-col h-full">
      {/* Admin Panel Shortcut - only visible to admins */}
      {isAdmin && (
        <div className="px-4 pt-4 pb-2">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveView('admin')}
            className="w-full py-2.5 rounded-lg gold-gradient-bg text-background text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4" />
            Go to Admin Panel
          </motion.button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 border-r border-border p-3 space-y-1 overflow-y-auto hidden md:block flex-shrink-0">
          {visibleTabs.map(tab => {
            const TabIcon = tab.icon
            return (
              <motion.button
                key={tab.id}
                whileHover={{ x: 2, backgroundColor: 'rgba(212,165,116,0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-nova-gold/10 text-nova-gold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TabIcon className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-medium">{tab.label}</span>
                {tab.adminOnly && <Lock className="w-3 h-3 text-nova-gold/50 ml-auto" />}
              </motion.button>
            )
          })}
        </div>

        <div className="md:hidden flex overflow-x-auto gap-1 p-3 border-b border-border flex-shrink-0 w-full">
          {visibleTabs.map(tab => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-nova-gold/10 text-nova-gold' : 'text-muted-foreground'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.adminOnly && <Lock className="w-3 h-3 text-nova-gold/50" />}
              </button>
            )
          })}
        </div>

        <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
