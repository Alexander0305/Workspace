'use client'

import { useNovaStore, PERSONALITIES, type Personality } from '@/lib/nova-store'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export function PersonalitySwitcher() {
  const { personality, setPersonality } = useNovaStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const current = PERSONALITIES[personality]

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border hover:border-nova-gold/30 transition-colors"
      >
        <span className="text-sm">{current.emoji}</span>
        <span className="text-sm font-medium text-foreground">{current.name}</span>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-64 rounded-xl glass-card p-2 z-50"
          >
            {(Object.entries(PERSONALITIES) as [Personality, typeof current][]).map(([key, p]) => (
              <motion.button
                key={key}
                whileHover={{ x: 4, backgroundColor: 'rgba(212,165,116,0.1)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setPersonality(key); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  personality === key ? 'bg-nova-gold/10 border-l-2 border-nova-gold' : ''
                }`}
              >
                <span className="text-lg">{p.emoji}</span>
                <div className="text-left">
                  <div className="text-sm font-medium text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.description}</div>
                </div>
                {personality === key && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-auto w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
