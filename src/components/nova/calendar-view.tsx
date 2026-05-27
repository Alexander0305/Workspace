'use client'

import { useNovaStore, type CalendarEvent } from '@/lib/nova-store'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, ChevronLeft, ChevronRight, Plus, Clock, X, Trash2 } from 'lucide-react'
import { useState, useMemo } from 'react'

const EVENT_COLORS: Record<string, string> = {
  meeting: '#7c3aed',
  reminder: '#d4a574',
  task: '#10b981',
  event: '#3b82f6',
}

const EVENT_LABELS: Record<string, string> = {
  meeting: 'Meeting',
  reminder: 'Reminder',
  task: 'Task',
  event: 'Event',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarView() {
  const { calendarEvents, addEvent, deleteEvent } = useNovaStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newType, setNewType] = useState<CalendarEvent['type']>('event')
  const [newDesc, setNewDesc] = useState('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()
    const days: { date: number; month: number; year: number; isCurrentMonth: boolean }[] = []

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: daysInPrevMonth - i, month: month - 1, year, isCurrentMonth: false })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: i, month, year, isCurrentMonth: true })
    }
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: i, month: month + 1, year, isCurrentMonth: false })
    }
    return days
  }, [year, month])

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const getEventForDay = (dateStr: string) => calendarEvents.filter(e => e.date === dateStr)

  const formatDateStr = (d: number, m: number, y: number) => {
    const date = new Date(y, m, d)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const selectedEvents = selectedDate ? getEventForDay(selectedDate) : []

  const upcomingEvents = [...calendarEvents]
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 5)

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const handleAdd = () => {
    if (!newTitle.trim() || !newDate) return
    const event: CalendarEvent = {
      id: `e-${Date.now()}`,
      title: newTitle.trim(),
      date: newDate,
      time: newTime || undefined,
      type: newType,
      description: newDesc.trim() || undefined,
    }
    addEvent(event)
    setNewTitle('')
    setNewDate('')
    setNewTime('')
    setNewType('event')
    setNewDesc('')
    setShowAddDialog(false)
  }

  const monthName = currentDate.toLocaleString('default', { month: 'long' })

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-nova-gold" />
            Calendar
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{calendarEvents.length} events scheduled</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Event
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        {/* Calendar grid */}
        <div className="lg:col-span-2 glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-secondary/30 text-muted-foreground">
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <h4 className="text-sm font-semibold text-foreground">{monthName} {year}</h4>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-secondary/30 text-muted-foreground">
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {DAYS.map(day => (
              <div key={day} className="text-center text-[10px] text-muted-foreground py-1 font-medium">{day}</div>
            ))}
            {calendarDays.map((day, i) => {
              const dateStr = formatDateStr(day.date, day.month, day.year)
              const events = getEventForDay(dateStr)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              return (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative p-1 min-h-[48px] rounded-lg text-xs transition-all flex flex-col items-center ${
                    !day.isCurrentMonth ? 'text-muted-foreground/30' : 'text-foreground'
                  } ${isToday ? 'bg-nova-gold/20 border border-nova-gold/40' : ''} ${isSelected ? 'ring-1 ring-nova-purple' : 'hover:bg-secondary/30'}`}
                >
                  <span className={`text-[10px] ${isToday ? 'font-bold text-nova-gold' : ''}`}>{day.date}</span>
                  {events.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {events.slice(0, 3).map(e => (
                        <div key={e.id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: EVENT_COLORS[e.type] }} />
                      ))}
                    </div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected day events */}
          <div className="glass-card p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Select a day'}
            </h4>
            {selectedDate ? (
              selectedEvents.length > 0 ? (
                <div className="space-y-2">
                  <AnimatePresence>
                    {selectedEvents.map(event => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex items-start gap-2 p-2 rounded-lg bg-secondary/20"
                      >
                        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: EVENT_COLORS[event.type] }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground">{event.title}</p>
                          {event.time && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" /> {event.time}
                            </p>
                          )}
                          <span className="text-[10px] text-muted-foreground">{EVENT_LABELS[event.type]}</span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteEvent(event.id)}
                          className="p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No events on this day</p>
              )
            ) : (
              <p className="text-xs text-muted-foreground">Click a day to view events</p>
            )}
          </div>

          {/* Upcoming events */}
          <div className="glass-card p-4">
            <h4 className="text-sm font-semibold text-foreground mb-3">Upcoming</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {upcomingEvents.map(event => (
                <div key={event.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/20 transition-colors cursor-pointer" onClick={() => setSelectedDate(event.date)}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: EVENT_COLORS[event.type] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{event.title}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} {event.time || ''}</p>
                  </div>
                </div>
              ))}
              {upcomingEvents.length === 0 && <p className="text-xs text-muted-foreground">No upcoming events</p>}
            </div>
          </div>

          {/* Legend */}
          <div className="glass-card p-4">
            <h4 className="text-xs font-semibold text-foreground mb-2">Event Types</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(EVENT_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[10px] text-muted-foreground">{EVENT_LABELS[type]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add event dialog */}
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
                <h3 className="text-lg font-semibold text-foreground">Add Event</h3>
                <button onClick={() => setShowAddDialog(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                  <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Event title..." className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                    <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                    <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value as CalendarEvent['type'])} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                    <option value="event">Event</option>
                    <option value="meeting">Meeting</option>
                    <option value="reminder">Reminder</option>
                    <option value="task">Task</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                  <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Event description..." rows={2} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold resize-none" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAdd} className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium">Add Event</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
