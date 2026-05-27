'use client'

import { useNovaStore, type Task } from '@/lib/nova-store'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckSquare, Plus, Trash2, Clock, AlertCircle, Circle, ChevronRight, X } from 'lucide-react'
import { useState } from 'react'

const STATUS_CONFIG = {
  todo: { label: 'To Do', icon: Circle, color: 'text-muted-foreground', bg: 'bg-secondary/30' },
  'in-progress': { label: 'In Progress', icon: ChevronRight, color: 'text-nova-gold', bg: 'bg-nova-gold/10' },
  done: { label: 'Done', icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  medium: { label: 'Medium', color: 'text-nova-gold', bg: 'bg-nova-gold/10' },
  high: { label: 'High', color: 'text-red-400', bg: 'bg-red-400/10' },
}

export function TasksView() {
  const { tasks, addTask, updateTask, deleteTask } = useNovaStore()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newDueDate, setNewDueDate] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    return true
  })

  const todoTasks = filtered.filter(t => t.status === 'todo')
  const inProgressTasks = filtered.filter(t => t.status === 'in-progress')
  const doneTasks = filtered.filter(t => t.status === 'done')

  const handleAdd = () => {
    if (!newTitle.trim()) return
    const task: Task = {
      id: `t-${Date.now()}`,
      title: newTitle.trim(),
      description: newDesc.trim(),
      status: 'todo',
      priority: newPriority,
      dueDate: newDueDate || undefined,
      createdAt: new Date(),
    }
    addTask(task)
    setNewTitle('')
    setNewDesc('')
    setNewPriority('medium')
    setNewDueDate('')
    setShowAddDialog(false)
  }

  const handleDelete = (id: string) => {
    if (deleteConfirmId === id) {
      deleteTask(id)
      setDeleteConfirmId(null)
    } else {
      setDeleteConfirmId(id)
      setTimeout(() => setDeleteConfirmId(null), 3000)
    }
  }

  const todoCount = tasks.filter(t => t.status === 'todo').length
  const progressCount = tasks.filter(t => t.status === 'in-progress').length
  const doneCount = tasks.filter(t => t.status === 'done').length

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-nova-gold" />
            Tasks
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {tasks.length} total · {todoCount} to do · {progressCount} in progress · {doneCount} done
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Task
        </motion.button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'To Do', count: todoCount, color: 'text-muted-foreground', bg: 'bg-secondary/30' },
          { label: 'In Progress', count: progressCount, color: 'text-nova-gold', bg: 'bg-nova-gold/10' },
          { label: 'Done', count: doneCount, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
        ].map(s => (
          <motion.div key={s.label} whileHover={{ scale: 1.02 }} className="glass-card p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus-gold"
        >
          <option value="all">All Status</option>
          <option value="todo">To Do</option>
          <option value="in-progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground outline-none focus-gold"
        >
          <option value="all">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
        {[
          { status: 'todo' as const, tasks: todoTasks },
          { status: 'in-progress' as const, tasks: inProgressTasks },
          { status: 'done' as const, tasks: doneTasks },
        ].map(column => {
          const config = STATUS_CONFIG[column.status]
          const StatusIcon = config.icon
          return (
            <div key={column.status} className="flex flex-col">
              <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${config.bg}`}>
                <StatusIcon className={`w-4 h-4 ${config.color}`} />
                <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{column.tasks.length}</span>
              </div>
              <div className="flex-1 space-y-2 p-2 rounded-b-lg bg-secondary/10 min-h-[120px]">
                <AnimatePresence>
                  {column.tasks.map(task => (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      whileHover={{ scale: 1.01, y: -1 }}
                      className="glass-card p-3 cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{task.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(task.id)}
                            className={`p-1 rounded transition-colors ${
                              deleteConfirmId === task.id ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-destructive'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </motion.button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[task.priority].bg} ${PRIORITY_CONFIG[task.priority].color}`}>
                          {PRIORITY_CONFIG[task.priority].label}
                        </span>
                        {task.dueDate && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {task.status !== 'done' && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateTask(task.id, { status: task.status === 'todo' ? 'in-progress' : 'done' })}
                            className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-nova-gold/10 text-nova-gold hover:bg-nova-gold/20 transition-colors"
                          >
                            {task.status === 'todo' ? 'Start' : 'Complete'}
                          </motion.button>
                        )}
                      </div>
                      {deleteConfirmId === task.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20"
                        >
                          <p className="text-[10px] text-destructive mb-1">Delete this task?</p>
                          <div className="flex gap-2">
                            <button onClick={() => deleteTask(task.id)} className="text-[10px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground">Yes, delete</button>
                            <button onClick={() => setDeleteConfirmId(null)} className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">Cancel</button>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {column.tasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="w-6 h-6 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
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
                <h3 className="text-lg font-semibold text-foreground">Add Task</h3>
                <button onClick={() => setShowAddDialog(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Task title..."
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Task description..."
                    rows={3}
                    className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Due Date</label>
                    <input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAdd} disabled={!newTitle.trim()} className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium disabled:opacity-50">Add Task</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
