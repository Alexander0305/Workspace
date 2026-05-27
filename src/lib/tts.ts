// NOVA Text-to-Speech System — Browser SpeechSynthesis API

type PersonalityVoice = 'nova' | 'athena' | 'aria' | 'zeus'

const PERSONALITY_VOICE_PREFERENCES: Record<PersonalityVoice, { pitch: number; rate: number; preferredNames: string[] }> = {
  nova: { pitch: 1.0, rate: 1.0, preferredNames: ['Samantha', 'Karen', 'Google US English', 'Microsoft Zira'] },
  athena: { pitch: 0.9, rate: 0.9, preferredNames: ['Victoria', 'Moira', 'Google UK English Female', 'Microsoft Hazel'] },
  aria: { pitch: 1.2, rate: 1.05, preferredNames: ['Fiona', 'Tessa', 'Google US English', 'Microsoft Zira'] },
  zeus: { pitch: 0.7, rate: 1.1, preferredNames: ['Daniel', 'Alex', 'Google UK English Male', 'Microsoft David'] },
}

let currentUtterance: SpeechSynthesisUtterance | null = null
let isCurrentlySpeaking = false
let speechQueue: string[] = []

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null
  return window.speechSynthesis || null
}

function selectVoice(personality: PersonalityVoice): SpeechSynthesisVoice | null {
  const synth = getSpeechSynthesis()
  if (!synth) return null

  const voices = synth.getVoices()
  const prefs = PERSONALITY_VOICE_PREFERENCES[personality]

  // Try preferred names
  for (const name of prefs.preferredNames) {
    const match = voices.find(v => v.name.includes(name))
    if (match) return match
  }

  // Fallback: English voices
  const englishVoice = voices.find(v => v.lang.startsWith('en'))
  if (englishVoice) return englishVoice

  // Any voice
  return voices[0] || null
}

export function speak(text: string, options?: { rate?: number; pitch?: number; voice?: string; personality?: string }): void {
  const synth = getSpeechSynthesis()
  if (!synth) return

  // Cancel any current speech
  stopSpeaking()

  // Clean text for speech (remove markdown, emojis, etc.)
  const cleanText = text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/```[\s\S]*?```/g, 'code block')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[✦🦉🎵⚡🌟✨🔥💡🎯📊💬📝🔍🚀]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleanText) return

  // If currently speaking, queue it
  if (isCurrentlySpeaking) {
    speechQueue.push(cleanText)
    return
  }

  const utterance = new SpeechSynthesisUtterance(cleanText)
  const personality = (options?.personality || 'nova') as PersonalityVoice
  const prefs = PERSONALITY_VOICE_PREFERENCES[personality]

  // Set voice
  const voice = selectVoice(personality)
  if (voice) {
    utterance.voice = voice
  }

  // Set parameters
  utterance.rate = options?.rate ?? prefs.rate
  utterance.pitch = options?.pitch ?? prefs.pitch
  utterance.volume = 1

  utterance.onstart = () => {
    isCurrentlySpeaking = true
  }

  utterance.onend = () => {
    isCurrentlySpeaking = false
    currentUtterance = null

    // Process queue
    if (speechQueue.length > 0) {
      const next = speechQueue.shift()
      if (next) speak(next, options)
    }
  }

  utterance.onerror = () => {
    isCurrentlySpeaking = false
    currentUtterance = null
  }

  currentUtterance = utterance
  synth.speak(utterance)
}

export function stopSpeaking(): void {
  const synth = getSpeechSynthesis()
  if (!synth) return

  synth.cancel()
  isCurrentlySpeaking = false
  currentUtterance = null
  speechQueue = []
}

export function isSpeaking(): boolean {
  return isCurrentlySpeaking
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  const synth = getSpeechSynthesis()
  if (!synth) return []
  return synth.getVoices()
}

export function setPersonalityVoice(personality: PersonalityVoice): void {
  // This just updates the preference for next speak() call
  // The actual voice selection happens in speak()
  void personality
}
