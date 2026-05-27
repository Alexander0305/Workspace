'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Video,
  Download,
  Loader2,
  Sparkles,
  Film,
  Clock,
  Camera,
  Image as ImageIcon,
  ZoomIn,
  X,
  Clapperboard,
  Play,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface VideoScene {
  title: string
  description: string
  cameraMovement: string
  duration: string
  mood: string
}

interface VideoConcept {
  id: string
  prompt: string
  style: string
  scenes: VideoScene[]
  overallMood: string
  thumbnail: string | null
  sceneImages: Record<number, string>
  timestamp: Date
}

const STYLE_PRESETS = [
  { name: 'Cinematic', prompt: ', cinematic lighting, anamorphic lens, film grain, dramatic composition, movie scene', icon: '🎬' },
  { name: 'Animation', prompt: ', animated style, vibrant colors, smooth motion, stylized characters, dynamic framing', icon: '✨' },
  { name: 'Documentary', prompt: ', documentary style, natural lighting, handheld camera feel, authentic, raw footage aesthetic', icon: '📹' },
  { name: 'Sci-Fi', prompt: ', science fiction, futuristic technology, neon glow, cyberpunk atmosphere, advanced visual effects', icon: '🚀' },
  { name: 'Nature', prompt: ', nature documentary, golden hour lighting, aerial drone shots, wildlife, landscape photography', icon: '🌿' },
  { name: 'Abstract', prompt: ', abstract art, experimental visuals, surreal imagery, fluid motion, artistic interpretation', icon: '🎨' },
]

const VIDEO_CONCEPT_SYSTEM_PROMPT = `You are NOVA's Video Concept Generator. Given a user's video prompt and style, generate a detailed video concept with 3 scenes for a storyboard.

You MUST respond in the following exact JSON format (no markdown, no code blocks, just raw JSON):
{
  "overallMood": "A brief description of the overall mood/atmosphere",
  "scenes": [
    {
      "title": "Scene 1 Title",
      "description": "Detailed visual description of what happens in this scene, including composition, lighting, colors, and subject matter. Be vivid and specific.",
      "cameraMovement": "e.g. Slow dolly in, Crane shot ascending, Tracking shot left to right",
      "duration": "e.g. 5 seconds, 8 seconds",
      "mood": "Specific mood for this scene"
    },
    {
      "title": "Scene 2 Title",
      "description": "...",
      "cameraMovement": "...",
      "duration": "...",
      "mood": "..."
    },
    {
      "title": "Scene 3 Title",
      "description": "...",
      "cameraMovement": "...",
      "duration": "...",
      "mood": "..."
    }
  ]
}

Make the scenes flow naturally as a continuous video. Be creative and cinematic with your descriptions. Each scene description should be rich enough to generate a compelling image from it.`

export function VideoGenerationView() {
  const { authFetch } = useAuth()

  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('Cinematic')
  const [loading, setLoading] = useState(false)
  const [sceneImageLoading, setSceneImageLoading] = useState<Record<number, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [activeConcept, setActiveConcept] = useState<VideoConcept | null>(null)
  const [history, setHistory] = useState<VideoConcept[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [expandedScene, setExpandedScene] = useState<number | null>(null)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [showStyleDropdown, setShowStyleDropdown] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return

    setLoading(true)
    setError(null)

    const selectedStyle = STYLE_PRESETS.find(s => s.name === style)

    try {
      // Step 1: Generate video concept via AI chat
      const chatRes = await authFetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a video concept for: "${prompt.trim()}"${selectedStyle?.prompt || ''}`,
          personality: 'aria',
        }),
      })

      const chatData = await chatRes.json()

      if (chatData.error) {
        setError(chatData.error)
        return
      }

      // Parse the JSON response from the AI
      let conceptData: { overallMood: string; scenes: VideoScene[] }
      try {
        // Try to extract JSON from the response - it might be wrapped in markdown code blocks
        const responseText = chatData.response || chatData.content || ''
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          throw new Error('No JSON found in response')
        }
        conceptData = JSON.parse(jsonMatch[0])
      } catch {
        // Fallback: create a concept from the raw text
        const rawText = chatData.response || chatData.content || 'A compelling visual experience.'
        conceptData = {
          overallMood: 'Atmospheric and engaging',
          scenes: [
            {
              title: 'Opening Scene',
              description: rawText.substring(0, 300),
              cameraMovement: 'Slow establishing shot',
              duration: '5 seconds',
              mood: 'Mysterious and captivating',
            },
            {
              title: 'Development',
              description: 'The scene unfolds with dynamic movement and evolving visuals, building tension and intrigue.',
              cameraMovement: 'Tracking shot',
              duration: '8 seconds',
              mood: 'Building intensity',
            },
            {
              title: 'Climax',
              description: 'A powerful concluding scene that delivers visual impact and emotional resonance.',
              cameraMovement: 'Dramatic pull back',
              duration: '6 seconds',
              mood: 'Powerful and resonant',
            },
          ],
        }
      }

      // Step 2: Generate thumbnail image from the first scene description
      let thumbnail: string | null = null
      try {
        const firstSceneDesc = conceptData.scenes[0]?.description || prompt.trim()
        const imagePrompt = `${firstSceneDesc}${selectedStyle?.prompt || ''}, key frame, high quality, detailed`

        const imageRes = await authFetch('/api/image-gen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: imagePrompt, size: '1344x768' }),
        })

        const imageData = await imageRes.json()
        if (imageData.image) {
          thumbnail = imageData.image
        }
      } catch {
        // Thumbnail generation is non-critical, continue without it
      }

      const newConcept: VideoConcept = {
        id: `vid-${Date.now()}`,
        prompt: prompt.trim(),
        style,
        scenes: conceptData.scenes || [],
        overallMood: conceptData.overallMood || 'Atmospheric',
        thumbnail,
        sceneImages: thumbnail ? { 0: thumbnail } : {},
        timestamp: new Date(),
      }

      setActiveConcept(newConcept)
      setHistory(prev => [newConcept, ...prev.slice(0, 19)])
      setExpandedScene(0)
    } catch {
      setError('Failed to generate video concept. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSceneImage = async (sceneIndex: number) => {
    if (!activeConcept || sceneImageLoading[sceneIndex]) return

    setSceneImageLoading(prev => ({ ...prev, [sceneIndex]: true }))

    const selectedStyle = STYLE_PRESETS.find(s => s.name === activeConcept.style)
    const scene = activeConcept.scenes[sceneIndex]
    const imagePrompt = `${scene.description}${selectedStyle?.prompt || ''}, cinematic frame, high quality, detailed`

    try {
      const imageRes = await authFetch('/api/image-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imagePrompt, size: '1344x768' }),
      })

      const imageData = await imageRes.json()

      if (imageData.error) {
        setError(imageData.error)
        return
      }

      if (imageData.image) {
        const updatedConcept = {
          ...activeConcept,
          sceneImages: { ...activeConcept.sceneImages, [sceneIndex]: imageData.image },
        }
        setActiveConcept(updatedConcept)

        // Also update in history
        setHistory(prev =>
          prev.map(item => (item.id === updatedConcept.id ? updatedConcept : item))
        )
      }
    } catch {
      setError('Failed to generate scene image. Please try again.')
    } finally {
      setSceneImageLoading(prev => ({ ...prev, [sceneIndex]: false }))
    }
  }

  const handleDownload = (imageData: string, filename: string) => {
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${imageData}`
    link.download = `${filename || 'nova-video-frame'}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleHistoryConceptClick = (concept: VideoConcept) => {
    setActiveConcept(concept)
    setShowHistory(false)
    setExpandedScene(0)
  }

  const handleRegenerate = () => {
    if (activeConcept) {
      setPrompt(activeConcept.prompt)
      setStyle(activeConcept.style)
    }
  }

  return (
    <div className="h-full flex flex-col p-4 lg:p-6 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nova-gold/20 to-nova-gold/10 flex items-center justify-center border border-nova-gold/30">
            <Video className="w-5 h-5 text-nova-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Video Studio</h2>
            <p className="text-xs text-muted-foreground">Generate AI-powered video concepts &amp; storyboards</p>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
        {/* Left Panel - Controls */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:w-80 flex-shrink-0 space-y-4"
        >
          {/* Prompt Input */}
          <div className="glass-card p-4 space-y-3">
            <label className="text-xs font-semibold text-nova-gold flex items-center gap-1.5">
              <Clapperboard className="w-3.5 h-3.5" />
              Video Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to create..."
              rows={4}
              className="w-full bg-secondary/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none border border-border focus:border-nova-gold/30 transition-colors"
            />
          </div>

          {/* Style Presets */}
          <div className="glass-card p-4 space-y-3">
            <label className="text-xs font-semibold text-nova-gold flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              Style
            </label>
            {/* Mobile Dropdown */}
            <div className="lg:hidden relative">
              <button
                onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 border border-border hover:border-nova-gold/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{STYLE_PRESETS.find(s => s.name === style)?.icon}</span>
                  <span className="text-xs font-medium text-foreground">{style}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              <AnimatePresence>
                {showStyleDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 right-0 mt-1 z-10 glass-card border border-nova-gold/20 overflow-hidden"
                  >
                    {STYLE_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        onClick={() => { setStyle(preset.name); setShowStyleDropdown(false) }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-nova-gold/5 transition-colors ${
                          style === preset.name ? 'bg-nova-gold/10' : ''
                        }`}
                      >
                        <span className="text-sm">{preset.icon}</span>
                        <span className="text-xs font-medium text-foreground">{preset.name}</span>
                        {style === preset.name && (
                          <div className="ml-auto w-2 h-2 rounded-full bg-nova-gold" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Desktop Grid */}
            <div className="hidden lg:grid grid-cols-2 gap-2">
              {STYLE_PRESETS.map((preset) => (
                <motion.button
                  key={preset.name}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStyle(preset.name)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    style === preset.name
                      ? 'bg-nova-gold/15 text-nova-gold border border-nova-gold/40 shadow-[0_0_8px_rgba(212,165,116,0.15)]'
                      : 'bg-secondary/30 text-muted-foreground border border-border hover:border-nova-gold/20 hover:text-foreground'
                  }`}
                >
                  <span className="text-sm">{preset.icon}</span>
                  {preset.name}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerate}
            disabled={!prompt.trim() || loading}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
              prompt.trim() && !loading
                ? 'gold-gradient-bg text-background shadow-[0_0_15px_rgba(212,165,116,0.3)]'
                : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Concept...
              </>
            ) : (
              <>
                <Film className="w-4 h-4" />
                Generate Video
              </>
            )}
          </motion.button>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-card p-3 border-destructive/30"
              >
                <p className="text-xs text-destructive">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Panel - Video Concept Display + History */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto pr-1">
            {activeConcept ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {/* Video Concept Header Card */}
                <div className="glass-card p-4">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    <div className="relative group flex-shrink-0 w-48 h-28 rounded-lg overflow-hidden bg-secondary/20 border border-border">
                      {activeConcept.thumbnail ? (
                        <>
                          <img
                            src={`data:image/png;base64,${activeConcept.thumbnail}`}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={() => setLightboxImage(activeConcept.thumbnail!)}
                          />
                          {/* Play icon overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                              <Play className="w-5 h-5 text-white ml-0.5" />
                            </div>
                          </div>
                          {/* Zoom on hover */}
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => setLightboxImage(activeConcept.thumbnail!)}
                              className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border"
                            >
                              <ZoomIn className="w-3 h-3 text-foreground" />
                            </motion.button>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Concept Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-nova-gold flex-shrink-0" />
                        <span className="text-xs font-medium text-nova-gold">{activeConcept.style}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {activeConcept.scenes.length} scenes
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1 line-clamp-1">
                        {activeConcept.prompt}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        Mood: {activeConcept.overallMood}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        {activeConcept.thumbnail && (
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleDownload(activeConcept.thumbnail!, `nova-video-thumb-${activeConcept.id}`)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-card text-xs text-foreground hover:border-nova-gold/30 hover:text-nova-gold transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            Thumbnail
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={handleRegenerate}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg glass-card text-xs text-foreground hover:border-nova-gold/30 hover:text-nova-gold transition-colors"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Regenerate
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scene Cards */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Camera className="w-4 h-4 text-nova-gold" />
                    Storyboard Scenes
                  </h3>

                  {activeConcept.scenes.map((scene, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass-card overflow-hidden"
                    >
                      {/* Scene Header - Always Visible */}
                      <button
                        onClick={() => setExpandedScene(expandedScene === index ? null : index)}
                        className="w-full p-4 flex items-center gap-3 text-left hover:bg-nova-gold/5 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nova-gold/20 to-nova-gold/5 flex items-center justify-center border border-nova-gold/20 flex-shrink-0">
                          <span className="text-xs font-bold text-nova-gold">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{scene.title}</p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                            <span>{scene.duration}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                            <span>{scene.mood}</span>
                          </p>
                        </div>
                        <motion.div
                          animate={{ rotate: expandedScene === index ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                      </button>

                      {/* Expanded Scene Content */}
                      <AnimatePresence>
                        {expandedScene === index && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3">
                              {/* Scene Image */}
                              {activeConcept.sceneImages[index] ? (
                                <div className="relative group rounded-lg overflow-hidden border border-border">
                                  <img
                                    src={`data:image/png;base64,${activeConcept.sceneImages[index]}`}
                                    alt={scene.title}
                                    className="w-full aspect-video object-cover cursor-pointer"
                                    onClick={() => setLightboxImage(activeConcept.sceneImages[index])}
                                  />
                                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => setLightboxImage(activeConcept.sceneImages[index]!)}
                                      className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border"
                                    >
                                      <ZoomIn className="w-3.5 h-3.5 text-foreground" />
                                    </motion.button>
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => handleDownload(activeConcept.sceneImages[index]!, `nova-scene-${index + 1}-${activeConcept.id}`)}
                                      className="p-1.5 rounded-md bg-background/80 backdrop-blur-sm border border-border"
                                    >
                                      <Download className="w-3.5 h-3.5 text-foreground" />
                                    </motion.button>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full aspect-video rounded-lg bg-secondary/20 border border-border flex flex-col items-center justify-center gap-2">
                                  <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                                  <p className="text-xs text-muted-foreground/60">No scene image generated yet</p>
                                </div>
                              )}

                              {/* Scene Description */}
                              <div className="space-y-2">
                                <div>
                                  <p className="text-[10px] font-semibold text-nova-gold/80 uppercase tracking-wider mb-1">Description</p>
                                  <p className="text-xs text-foreground/90 leading-relaxed">{scene.description}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="bg-secondary/20 rounded-lg p-2.5">
                                    <p className="text-[10px] font-semibold text-nova-gold/80 uppercase tracking-wider mb-0.5">Camera</p>
                                    <p className="text-xs text-foreground/80">{scene.cameraMovement}</p>
                                  </div>
                                  <div className="bg-secondary/20 rounded-lg p-2.5">
                                    <p className="text-[10px] font-semibold text-nova-gold/80 uppercase tracking-wider mb-0.5">Duration</p>
                                    <p className="text-xs text-foreground/80">{scene.duration}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Generate Scene Image Button */}
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleGenerateSceneImage(index)}
                                disabled={sceneImageLoading[index]}
                                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                                  sceneImageLoading[index]
                                    ? 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
                                    : 'bg-nova-gold/10 text-nova-gold border border-nova-gold/20 hover:bg-nova-gold/15 hover:border-nova-gold/30'
                                }`}
                              >
                                {sceneImageLoading[index] ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    Generating Scene Image...
                                  </>
                                ) : (
                                  <>
                                    <Camera className="w-3.5 h-3.5" />
                                    {activeConcept.sceneImages[index] ? 'Regenerate Scene Image' : 'Generate Scene Image'}
                                  </>
                                )}
                              </motion.button>

                              {/* Download button if image exists */}
                              {activeConcept.sceneImages[index] && (
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleDownload(activeConcept.sceneImages[index]!, `nova-scene-${index + 1}-${activeConcept.id}`)}
                                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg glass-card text-xs text-foreground hover:border-nova-gold/30 hover:text-nova-gold transition-colors"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  Download Scene Image
                                </motion.button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-nova-gold/10 to-nova-gold/5 flex items-center justify-center mx-auto mb-4 border border-nova-gold/20"
                  >
                    <Video className="w-10 h-10 text-nova-gold/50" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground mb-1">No video concept generated yet</p>
                  <p className="text-xs text-muted-foreground/60">Enter a prompt and click Generate Video</p>
                </div>
              </div>
            )}
          </div>

          {/* History Toggle */}
          {history.length > 0 && (
            <div className="mt-3 flex-shrink-0">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-nova-gold transition-colors"
              >
                <Clock className="w-3.5 h-3.5" />
                {showHistory ? 'Hide' : 'Show'} History ({history.length})
              </button>
            </div>
          )}

          {/* History Grid */}
          <AnimatePresence>
            {showHistory && history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 flex-shrink-0 max-h-48 overflow-y-auto"
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {history.map((concept) => (
                    <motion.div
                      key={concept.id}
                      whileHover={{ scale: 1.03 }}
                      className="glass-card p-2 cursor-pointer group"
                      onClick={() => handleHistoryConceptClick(concept)}
                    >
                      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-secondary/20 border border-border group-hover:border-nova-gold/30 transition-colors mb-1.5">
                        {concept.thumbnail ? (
                          <img
                            src={`data:image/png;base64,${concept.thumbnail}`}
                            alt={concept.prompt}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-5 h-5 text-muted-foreground/30" />
                          </div>
                        )}
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-4 h-4 text-white ml-0.5" />
                        </div>
                      </div>
                      <p className="text-[10px] text-foreground truncate">{concept.prompt}</p>
                      <p className="text-[9px] text-muted-foreground">{concept.style} · {concept.scenes.length} scenes</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-10"
            >
              <X className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => { e.stopPropagation(); handleDownload(lightboxImage, 'nova-video-frame') }}
              className="absolute top-4 right-16 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-10"
            >
              <Download className="w-5 h-5 text-white" />
            </motion.button>
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={`data:image/png;base64,${lightboxImage}`}
              alt="Full size scene"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
