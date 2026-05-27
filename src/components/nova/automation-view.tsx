'use client'

import { useNovaStore, type Automation } from '@/lib/nova-store'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Plus, Trash2, ArrowRight, Clock, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { useState } from 'react'

const TRIGGERS = ['At specific time', 'When a file changes', 'When I receive an email', 'When crypto price changes', 'On startup']
const ACTIONS = ['Send notification', 'Run a script', 'Backup data', 'Post to social media', 'Execute trade']

export function AutomationView() {
  const { automations, addAutomation, toggleAutomation, deleteAutomation } = useNovaStore()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTrigger, setNewTrigger] = useState(TRIGGERS[0])
  const [newAction, setNewAction] = useState(ACTIONS[0])
  const [successFeedback, setSuccessFeedback] = useState(false)

  const enabledCount = automations.filter(a => a.enabled).length

  const handleAdd = () => {
    if (!newName.trim()) return
    const automation: Automation = {
      id: `a-${Date.now()}`,
      name: newName.trim(),
      trigger: newTrigger,
      action: newAction,
      enabled: true,
    }
    addAutomation(automation)
    setNewName('')
    setNewTrigger(TRIGGERS[0])
    setNewAction(ACTIONS[0])
    setShowAddDialog(false)
    setSuccessFeedback(true)
    setTimeout(() => setSuccessFeedback(false), 2000)
  }

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-nova-gold" />
            Automation
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{automations.length} automations · {enabledCount} active</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Automation
        </motion.button>
      </div>

      {/* Success feedback */}
      <AnimatePresence>
        {successFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2"
          >
            <Zap className="w-3.5 h-3.5" />
            Automation created successfully!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <AnimatePresence>
          {automations.map(auto => (
            <motion.div
              key={auto.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              whileHover={{ scale: 1.01, y: -2 }}
              className="glass-card p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${auto.enabled ? 'bg-nova-gold/10' : 'bg-secondary/30'}`}>
                    <Zap className={`w-4 h-4 ${auto.enabled ? 'text-nova-gold' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">{auto.name}</h4>
                    <span className={`text-[10px] ${auto.enabled ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                      {auto.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleAutomation(auto.id)}
                    className="p-1"
                  >
                    {auto.enabled ? (
                      <ToggleRight className="w-6 h-6 text-nova-gold" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                    )}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => deleteAutomation(auto.id)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/20 mb-3">
                <div className="flex-1 p-2 rounded-lg bg-nova-purple/10 text-center">
                  <p className="text-[10px] text-nova-purple font-medium">Trigger</p>
                  <p className="text-xs text-foreground mt-0.5">{auto.trigger}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-nova-gold flex-shrink-0" />
                <div className="flex-1 p-2 rounded-lg bg-nova-gold/10 text-center">
                  <p className="text-[10px] text-nova-gold font-medium">Action</p>
                  <p className="text-xs text-foreground mt-0.5">{auto.action}</p>
                </div>
              </div>

              {auto.lastRun && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px]">Last run: {new Date(auto.lastRun).toLocaleString()}</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {automations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Zap className="w-10 h-10 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">No automations yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first automation to get started</p>
        </div>
      )}

      <div className="glass-card p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-nova-gold" />
          Run History
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {automations.filter(a => a.lastRun).map(auto => (
            <div key={auto.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-foreground">{auto.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{new Date(auto.lastRun!).toLocaleString()}</span>
            </div>
          ))}
          {automations.filter(a => a.lastRun).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No run history yet</p>
          )}
        </div>
      </div>

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
                <h3 className="text-lg font-semibold text-foreground">New Automation</h3>
                <button onClick={() => setShowAddDialog(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                  <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Automation name..." className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Trigger</label>
                  <select value={newTrigger} onChange={(e) => setNewTrigger(e.target.value)} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                    {TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Action</label>
                  <select value={newAction} onChange={(e) => setNewAction(e.target.value)} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                    {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/20">
                  <div className="flex-1 p-2 rounded-lg bg-nova-purple/10 text-center">
                    <p className="text-[10px] text-nova-purple">{newTrigger}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-nova-gold" />
                  <div className="flex-1 p-2 rounded-lg bg-nova-gold/10 text-center">
                    <p className="text-[10px] text-nova-gold">{newAction}</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAdd} className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium">Create</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
