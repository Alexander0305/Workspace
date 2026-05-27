'use client'

import { useNovaStore, PERSONALITIES, type Personality } from '@/lib/nova-store'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ArrowRight, Check } from 'lucide-react'
import { useState, useEffect } from 'react'

const INTERESTS = [
  { id: 'coding', label: 'Coding', emoji: '💻' },
  { id: 'finance', label: 'Finance', emoji: '💰' },
  { id: 'social', label: 'Social Media', emoji: '📱' },
  { id: 'files', label: 'File Management', emoji: '📁' },
  { id: 'smarthome', label: 'Smart Home', emoji: '🏠' },
  { id: 'trading', label: 'Trading', emoji: '📈' },
  { id: 'writing', label: 'Writing', emoji: '✍️' },
  { id: 'learning', label: 'Learning', emoji: '📚' },
]

export function Onboarding() {
  const { showOnboarding, setShowOnboarding, setPersonality } = useNovaStore()
  const [step, setStep] = useState(0)
  const [selectedPersonality, setSelectedPersonality] = useState<Personality>('nova')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])

  // Check if already onboarded
  useEffect(() => {
    const onboarded = localStorage.getItem('nova-onboarded')
    if (onboarded === 'true') {
      setShowOnboarding(false)
    }
  }, [setShowOnboarding])

  const handleComplete = () => {
    localStorage.setItem('nova-onboarded', 'true')
    setPersonality(selectedPersonality)
    setShowOnboarding(false)
  }

  const handleSkip = () => {
    localStorage.setItem('nova-onboarded', 'true')
    setShowOnboarding(false)
  }

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  if (!showOnboarding) return null

  const totalSteps = 4

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #0d0a1a 50%, #1a0a2e 100%)' }}
      >
        {/* Skip button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleSkip}
          className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors z-10"
        >
          Skip
        </motion.button>

        <div className="w-full max-w-lg">
          {/* Progress bar */}
          <div className="flex gap-2 mb-8">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex-1 h-1 rounded-full bg-secondary/30 overflow-hidden">
                <motion.div
                  animate={{ width: i <= step ? '100%' : '0%' }}
                  transition={{ duration: 0.3 }}
                  className="h-full rounded-full progress-gold"
                />
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Welcome */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 flex items-center justify-center mx-auto mb-6 border border-nova-gold/30"
                >
                  <Zap className="w-10 h-10 text-nova-gold" />
                </motion.div>
                <h2 className="text-3xl font-bold gold-gradient-text mb-3">Welcome to NOVA</h2>
                <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
                  Your Neural Operative Virtual Assistant. A powerful AI companion that helps you code, manage tasks, automate workflows, and so much more.
                </p>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStep(1)}
                  className="px-8 py-3 rounded-xl gold-gradient-bg text-background text-sm font-semibold shadow-[0_0_20px_rgba(212,165,116,0.3)]"
                >
                  Get Started <ArrowRight className="w-4 h-4 inline ml-1" />
                </motion.button>
              </motion.div>
            )}

            {/* Step 2: Choose personality */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h2 className="text-2xl font-bold text-foreground text-center mb-2">Choose Your Personality</h2>
                <p className="text-sm text-muted-foreground text-center mb-6">Select the AI personality that fits your style</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {(Object.entries(PERSONALITIES) as [Personality, typeof PERSONALITIES.nova][]).map(([key, p]) => (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedPersonality(key)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        selectedPersonality === key
                          ? 'glass-card border-nova-gold/40 bg-nova-gold/5'
                          : 'glass-card hover:border-nova-gold/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{p.emoji}</span>
                        {selectedPersonality === key && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 rounded-full bg-nova-gold flex items-center justify-center">
                            <Check className="w-3 h-3 text-background" />
                          </motion.div>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </motion.button>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setStep(0)} className="px-4 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">Back</button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setStep(2)} className="px-6 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium">Next</motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Interests */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h2 className="text-2xl font-bold text-foreground text-center mb-2">What do you need?</h2>
                <p className="text-sm text-muted-foreground text-center mb-6">Select your interests to personalize your experience</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {INTERESTS.map(interest => (
                    <motion.button
                      key={interest.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleInterest(interest.id)}
                      className={`p-3 rounded-xl flex items-center gap-2.5 transition-all ${
                        selectedInterests.includes(interest.id)
                          ? 'glass-card border-nova-gold/40 bg-nova-gold/5'
                          : 'glass-card hover:border-nova-gold/20'
                      }`}
                    >
                      <span className="text-lg">{interest.emoji}</span>
                      <span className="text-sm text-foreground">{interest.label}</span>
                      {selectedInterests.includes(interest.id) && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-auto w-4 h-4 rounded-full bg-nova-gold flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-background" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">Back</button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setStep(3)} className="px-6 py-2 rounded-lg gold-gradient-bg text-background text-sm font-medium">Next</motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 4: All set */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-nova-gold/20 to-nova-purple/20 flex items-center justify-center mx-auto mb-6 border border-nova-gold/30"
                >
                  <Zap className="w-10 h-10 text-nova-gold" />
                </motion.div>
                <h2 className="text-3xl font-bold gold-gradient-text mb-3">You&apos;re All Set!</h2>
                <div className="glass-card p-4 mb-6 text-left max-w-sm mx-auto">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Personality</span>
                      <span className="text-xs text-foreground">{PERSONALITIES[selectedPersonality].emoji} {PERSONALITIES[selectedPersonality].name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Interests</span>
                      <span className="text-xs text-foreground">{selectedInterests.length > 0 ? selectedInterests.length : 'All'} selected</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <button onClick={() => setStep(2)} className="px-4 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors">Back</button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleComplete}
                    className="px-8 py-3 rounded-xl gold-gradient-bg text-background text-sm font-semibold shadow-[0_0_20px_rgba(212,165,116,0.3)]"
                  >
                    Launch NOVA <Zap className="w-4 h-4 inline ml-1" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === step ? 'bg-nova-gold w-6' : i < step ? 'bg-nova-gold/50' : 'bg-secondary/50'
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
