'use client'

import { useNovaStore } from '@/lib/nova-store'
import { motion } from 'framer-motion'
import { Timer, Play, Pause, RotateCcw, Coffee, Brain, Volume2, VolumeX } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { generateNotificationFromEvent } from '@/lib/notification-generator'

const PRESETS = [
  { label: 'Focus', minutes: 25, icon: Brain },
  { label: 'Break', minutes: 15, icon: Coffee },
  { label: 'Short Break', minutes: 5, icon: Coffee },
]

const QUOTES = [
  '"The only way to do great work is to love what you do." — Steve Jobs',
  '"Focus is the art of knowing what to ignore." — James Clear',
  '"Deep work is the ability to focus without distraction." — Cal Newport',
  '"Concentration is the secret of strength." — Ralph Waldo Emerson',
  '"The successful warrior is the average man, with laser-like focus." — Bruce Lee',
  '"Where focus goes, energy flows." — Tony Robbins',
  '"Do what you can, with what you have, where you are." — Theodore Roosevelt',
  '"It is during our darkest moments that we must focus to see the light." — Aristotle',
]

export function FocusTimerView() {
  const {
    focusTimerActive,
    focusTimerMinutes,
    focusTimerSeconds,
    setFocusTimerActive,
    setFocusTimerTime,
    focusSessionsCompleted,
    focusTotalMinutes,
    incrementFocusStats,
    addNotification,
  } = useNovaStore()

  const [totalSeconds, setTotalSeconds] = useState(25 * 60)
  const [currentQuote, setCurrentQuote] = useState(QUOTES[0])
  const [ambientSound, setAmbientSound] = useState(false)
  const [ambientVolume, setAmbientVolume] = useState(0.3)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  const remaining = focusTimerMinutes * 60 + focusTimerSeconds
  const progress = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0

  const startTimer = useCallback((minutes: number) => {
    setTotalSeconds(minutes * 60)
    setFocusTimerTime(minutes, 0)
    setFocusTimerActive(true)
    setCurrentQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])
  }, [setFocusTimerTime, setFocusTimerActive])

  useEffect(() => {
    if (focusTimerActive) {
      intervalRef.current = setInterval(() => {
        const state = useNovaStore.getState()
        const mins = state.focusTimerMinutes
        const secs = state.focusTimerSeconds

        if (mins === 0 && secs === 0) {
          setFocusTimerActive(false)
          const totalMins = Math.round(totalSeconds / 60)
          incrementFocusStats(totalMins)

          const notif = generateNotificationFromEvent('focus_session_complete', { minutes: totalMins })
          if (notif) addNotification(notif)

          // Visual alert - flash the border
          return
        }

        if (secs === 0) {
          setFocusTimerTime(Math.max(0, mins - 1), 59)
        } else {
          setFocusTimerTime(mins, Math.max(0, secs - 1))
        }
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [focusTimerActive, totalSeconds, setFocusTimerTime, setFocusTimerActive, incrementFocusStats, addNotification])

  // Ambient sound with Web Audio API
  useEffect(() => {
    if (ambientSound) {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }
      const ctx = audioContextRef.current

      // Create brown noise
      const bufferSize = 2 * ctx.sampleRate
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      let lastOut = 0.0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        output[i] = (lastOut + (0.02 * white)) / 1.02
        lastOut = output[i]
        output[i] *= 3.5
      }

      const source = ctx.createBufferSource()
      source.buffer = noiseBuffer
      source.loop = true

      const gainNode = ctx.createGain()
      gainNode.gain.value = ambientVolume

      source.connect(gainNode)
      gainNode.connect(ctx.destination)
      source.start()

      noiseNodeRef.current = source
      gainNodeRef.current = gainNode
    } else {
      if (noiseNodeRef.current) {
        noiseNodeRef.current.stop()
        noiseNodeRef.current = null
      }
      if (gainNodeRef.current) {
        gainNodeRef.current = null
      }
    }

    return () => {
      if (noiseNodeRef.current) {
        noiseNodeRef.current.stop()
        noiseNodeRef.current = null
      }
    }
  }, [ambientSound])

  // Update ambient volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = ambientVolume
    }
  }, [ambientVolume])

  const handlePause = () => setFocusTimerActive(!focusTimerActive)
  const handleReset = () => {
    setFocusTimerActive(false)
    setFocusTimerTime(25, 0)
    setTotalSeconds(25 * 60)
  }

  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const formatTime = (m: number, s: number) => `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

  return (
    <div className="flex flex-col h-full p-4 lg:p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Timer className="w-5 h-5 text-nova-gold" />
          Focus Timer
        </h3>
        <p className="text-xs text-muted-foreground mt-1">Stay focused, be productive</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Timer display */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
              <circle cx="130" cy="130" r="120" stroke="rgba(212,165,116,0.1)" strokeWidth="6" fill="none" />
              <motion.circle
                cx="130"
                cy="130"
                r="120"
                stroke={focusTimerActive ? '#d4a574' : '#7c3aed'}
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl sm:text-6xl font-bold gold-gradient-text ${focusTimerActive ? 'gold-glow-text' : ''}`}>
                {formatTime(focusTimerMinutes, focusTimerSeconds)}
              </span>
              <span className="text-xs text-muted-foreground mt-2">
                {focusTimerActive ? 'Focusing...' : remaining === totalSeconds ? 'Ready' : 'Paused'}
              </span>
            </div>
            {focusTimerActive && (
              <motion.div
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full border border-nova-gold/10 purple-glow"
              />
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mb-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleReset}
              className="p-3 rounded-full bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePause}
              className="p-4 rounded-full gold-gradient-bg text-background shadow-[0_0_20px_rgba(212,165,116,0.3)]"
            >
              {focusTimerActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setAmbientSound(!ambientSound)}
              className="p-3 rounded-full bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
            >
              {ambientSound ? <Volume2 className="w-5 h-5 text-nova-gold" /> : <VolumeX className="w-5 h-5" />}
            </motion.button>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-3">
            {PRESETS.map(preset => {
              const Icon = preset.icon
              return (
                <motion.button
                  key={preset.label}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => startTimer(preset.minutes)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg glass-card text-xs text-muted-foreground hover:text-nova-gold transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {preset.label} ({preset.minutes}m)
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Stats sidebar */}
        <div className="space-y-4">
          {/* Focus stats */}
          <div className="glass-card p-5">
            <h4 className="text-sm font-semibold text-foreground mb-3">Focus Stats</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Sessions Completed</span>
                <span className="text-lg font-bold text-nova-gold">{focusSessionsCompleted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total Focus Time</span>
                <span className="text-sm font-bold text-foreground">{focusTotalMinutes}m</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Avg Session</span>
                <span className="text-sm font-bold text-foreground">
                  {focusSessionsCompleted > 0 ? Math.round(focusTotalMinutes / focusSessionsCompleted) : 0}m
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Ambient Sound</span>
                <span className={`text-xs ${ambientSound ? 'text-nova-gold' : 'text-muted-foreground'}`}>
                  {ambientSound ? 'On' : 'Off'}
                </span>
              </div>
            </div>
          </div>

          {/* Ambient volume */}
          {ambientSound && (
            <div className="glass-card p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3">Ambient Volume</h4>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={ambientVolume}
                onChange={(e) => setAmbientVolume(Number(e.target.value))}
                className="w-full accent-nova-gold"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Quiet</span>
                <span>Loud</span>
              </div>
            </div>
          )}

          {/* Motivational quote */}
          <div className="glass-card p-5">
            <h4 className="text-sm font-semibold text-foreground mb-3">💡 Inspiration</h4>
            <p className="text-xs text-muted-foreground italic leading-relaxed">{currentQuote}</p>
          </div>

          {/* Session log */}
          <div className="glass-card p-5">
            <h4 className="text-sm font-semibold text-foreground mb-3">Session Log</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {focusSessionsCompleted > 0 ? (
                Array.from({ length: Math.min(focusSessionsCompleted, 5) }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20">
                    <div className="w-2 h-2 rounded-full bg-nova-gold" />
                    <span className="text-xs text-foreground">Focus session #{focusSessionsCompleted - i}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {focusTotalMinutes > 0 ? Math.round(focusTotalMinutes / focusSessionsCompleted) : 25} min
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">Complete your first session!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
