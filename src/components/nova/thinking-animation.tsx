'use client'

import { motion } from 'framer-motion'
import { Brain } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ThinkingAnimationProps {
  steps?: string[]
  isThinking?: boolean
  personalityName?: string
}

export function ThinkingAnimation({ steps = [], isThinking = true, personalityName = 'Nova' }: ThinkingAnimationProps) {
  const [visibleSteps, setVisibleSteps] = useState<string[]>([])
  const [currentDots, setCurrentDots] = useState('')

  useEffect(() => {
    if (!isThinking) {
      setVisibleSteps(steps)
      return
    }

    setVisibleSteps([])
    let stepIndex = 0
    const stepInterval = setInterval(() => {
      if (stepIndex < steps.length) {
        setVisibleSteps(prev => [...prev, steps[stepIndex]])
        stepIndex++
      } else {
        clearInterval(stepInterval)
      }
    }, 800)

    return () => clearInterval(stepInterval)
  }, [steps, isThinking])

  useEffect(() => {
    if (!isThinking) return
    const dotInterval = setInterval(() => {
      setCurrentDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 400)
    return () => clearInterval(dotInterval)
  }, [isThinking])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-3 p-4"
    >
      <motion.div
        animate={{ rotate: isThinking ? 360 : 0, scale: [1, 1.1, 1] }}
        transition={{ rotate: { duration: 2, repeat: isThinking ? Infinity : 0, ease: 'linear' }, scale: { duration: 1.5, repeat: Infinity } }}
        className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 flex items-center justify-center border border-nova-gold/20"
      >
        <Brain className="w-4 h-4 text-nova-gold" />
      </motion.div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium text-nova-gold">{personalityName} is thinking</span>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-sm text-nova-gold/60"
          >
            {currentDots}
          </motion.span>
        </div>

        {visibleSteps.length > 0 && (
          <div className="space-y-1.5">
            {visibleSteps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-nova-gold/50 flex-shrink-0" />
                <span>{step}</span>
              </motion.div>
            ))}
          </div>
        )}

        {isThinking && (
          <div className="flex items-center gap-1 mt-3">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.div
                key={i}
                animate={{ height: [4, 16, 4], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                className="w-1 rounded-full bg-nova-gold/40"
                style={{ height: 4 }}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
