'use client'

import { useNovaStore, type Note } from '@/lib/nova-store'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Plus, Trash2, Search, Save, X } from 'lucide-react'
import { useState, useEffect } from 'react'

const CATEGORIES = ['All', 'General', 'Technical', 'Personal', 'Ideas']

export function NotesView() {
  const { notes, addNote, updateNote, deleteNote } = useNovaStore()
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(notes[0]?.id || null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('General')
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const selectedNote = notes.find(n => n.id === selectedNoteId)

  const filtered = notes.filter(n => {
    const matchCat = selectedCategory === 'All' || n.category === selectedCategory
    const matchSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch
  })

  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [prevNoteId, setPrevNoteId] = useState<string | null>(null)

  if (selectedNoteId !== prevNoteId) {
    setPrevNoteId(selectedNoteId)
    if (selectedNote) {
      setEditTitle(selectedNote.title)
      setEditContent(selectedNote.content)
    }
  }

  const handleSave = () => {
    if (!selectedNoteId || !editTitle.trim()) return
    setSaving(true)
    updateNote(selectedNoteId, { title: editTitle.trim(), content: editContent, updatedAt: new Date() })
    setTimeout(() => setSaving(false), 800)
  }

  const handleAdd = () => {
    if (!newTitle.trim() || !newContent.trim()) return
    const note: Note = {
      id: `n-${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    addNote(note)
    setSelectedNoteId(note.id)
    setNewTitle('')
    setNewContent('')
    setNewCategory('General')
    setShowAddDialog(false)
  }

  const handleDelete = (id: string) => {
    if (deleteConfirmId === id) {
      deleteNote(id)
      setDeleteConfirmId(null)
      if (selectedNoteId === id) setSelectedNoteId(notes.find(n => n.id !== id)?.id || null)
    } else {
      setDeleteConfirmId(id)
      setTimeout(() => setDeleteConfirmId(null), 3000)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 lg:px-6 border-b border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-nova-gold" />
            Notes
          </h3>
          <p className="text-xs text-muted-foreground">{notes.length} notes</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
        >
          <Plus className="w-3.5 h-3.5" />
          New Note
        </motion.button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 lg:w-72 border-r border-border flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-secondary/30 border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus-gold"
              />
            </div>
          </div>

          <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-border">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-1 rounded text-[10px] whitespace-nowrap transition-colors ${
                  selectedCategory === cat ? 'bg-nova-gold/10 text-nova-gold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <AnimatePresence>
              {filtered.map(note => (
                <motion.button
                  key={note.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedNoteId === note.id
                      ? 'bg-nova-gold/10 border border-nova-gold/30'
                      : 'hover:bg-secondary/20 border border-transparent'
                  }`}
                >
                  <p className="text-xs font-medium text-foreground truncate">{note.title}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{note.content}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-nova-gold/10 text-nova-gold">{note.category}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileText className="w-6 h-6 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No notes found</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedNote ? (
            <>
              <div className="flex items-center justify-between p-3 border-b border-border">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-sm font-semibold text-foreground bg-transparent outline-none flex-1"
                />
                <div className="flex items-center gap-2">
                  {saving && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-emerald-500 flex items-center gap-1">
                      <Save className="w-3 h-3" /> Saved
                    </motion.span>
                  )}
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleSave} className="p-1.5 rounded-lg text-muted-foreground hover:text-nova-gold hover:bg-nova-gold/10 transition-colors">
                    <Save className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDelete(selectedNoteId)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      deleteConfirmId === selectedNoteId ? 'text-destructive bg-destructive/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
              {deleteConfirmId === selectedNoteId && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mx-3 mt-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <p className="text-[10px] text-destructive mb-1">Delete this note?</p>
                  <div className="flex gap-2">
                    <button onClick={() => { deleteNote(selectedNoteId); setSelectedNoteId(notes.find(n => n.id !== selectedNoteId)?.id || null); setDeleteConfirmId(null) }} className="text-[10px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground">Yes, delete</button>
                    <button onClick={() => setDeleteConfirmId(null)} className="text-[10px] px-2 py-0.5 rounded border border-border text-muted-foreground">Cancel</button>
                  </div>
                </motion.div>
              )}
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Start writing..."
                className="flex-1 bg-transparent p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none leading-relaxed"
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a note or create a new one</p>
              </div>
            </div>
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
                <h3 className="text-lg font-semibold text-foreground">New Note</h3>
                <button onClick={() => setShowAddDialog(false)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                  <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Note title..." className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold" />
                  {!newTitle.trim() && newTitle.length > 0 && <p className="text-[10px] text-destructive mt-1">Title is required</p>}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Content</label>
                  <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Start writing..." rows={4} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-gold resize-none" />
                  {!newContent.trim() && newContent.length > 0 && <p className="text-[10px] text-destructive mt-1">Content is required</p>}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus-gold">
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowAddDialog(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">Cancel</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleAdd} disabled={!newTitle.trim() || !newContent.trim()} className="px-4 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium disabled:opacity-50">Create Note</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
