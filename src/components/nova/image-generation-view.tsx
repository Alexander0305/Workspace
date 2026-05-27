'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ImageIcon,
  Download,
  Loader2,
  Sparkles,
  Wand2,
  ChevronDown,
  Clock,
  Trash2,
  Palette,
  ZoomIn,
  X,
} from 'lucide-react'

type ImageSize = '1024x1024' | '768x1344' | '1344x768'

interface GeneratedImage {
  id: string
  prompt: string
  size: ImageSize
  image: string
  style: string
  timestamp: Date
}

const STYLE_PRESETS = [
  { name: 'Realistic', prompt: ', photorealistic, ultra detailed, 8k, professional photography' },
  { name: 'Anime', prompt: ', anime style, cel shading, vibrant colors, detailed illustration' },
  { name: 'Digital Art', prompt: ', digital art, concept art, artstation trending, detailed' },
  { name: 'Oil Painting', prompt: ', oil painting, classical art, brush strokes, rich textures' },
  { name: 'Watercolor', prompt: ', watercolor painting, soft washes, delicate, artistic' },
  { name: 'Pixel Art', prompt: ', pixel art, 16-bit style, retro game aesthetic, detailed sprites' },
]

const SIZE_OPTIONS: { value: ImageSize; label: string; description: string }[] = [
  { value: '1024x1024', label: '1:1 Square', description: '1024 × 1024' },
  { value: '768x1344', label: '9:16 Portrait', description: '768 × 1344' },
  { value: '1344x768', label: '16:9 Landscape', description: '1344 × 768' },
]

export function ImageGenerationView() {
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState<ImageSize>('1024x1024')
  const [style, setStyle] = useState('Realistic')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null)
  const [history, setHistory] = useState<GeneratedImage[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showSizeDropdown, setShowSizeDropdown] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceSuccess, setEnhanceSuccess] = useState(false)

  const { authFetch } = useAuth()

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return

    setLoading(true)
    setError(null)

    const selectedStyle = STYLE_PRESETS.find(s => s.name === style)
    const fullPrompt = prompt.trim() + (selectedStyle?.prompt || '')

    try {
      const res = await authFetch('/api/image-gen', {
        method: 'POST',
        body: JSON.stringify({ prompt: fullPrompt, size }),
      })

      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      const newImage: GeneratedImage = {
        id: `img-${Date.now()}`,
        prompt: prompt.trim(),
        size,
        image: data.image,
        style,
        timestamp: new Date(),
      }

      setGeneratedImage(newImage)
      setHistory(prev => [newImage, ...prev.slice(0, 19)])
    } catch {
      setError('Failed to generate image. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (imageData: string, filename: string) => {
    const link = document.createElement('a')
    link.href = `data:image/png;base64,${imageData}`
    link.download = `${filename || 'nova-image'}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleHistoryImageClick = (img: GeneratedImage) => {
    setGeneratedImage(img)
    setShowHistory(false)
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
            <ImageIcon className="w-5 h-5 text-nova-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Image Studio</h2>
            <p className="text-xs text-muted-foreground">Generate AI-powered images</p>
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
            <label className="text-xs font-semibold text-nova-gold">Prompt</label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to create..."
                rows={4}
                className="w-full bg-secondary/20 rounded-lg px-3 py-2 pr-20 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none border border-border focus:border-nova-gold/30 transition-colors"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  if (!prompt.trim() || enhancing) return
                  setEnhancing(true)
                  try {
                    const res = await authFetch('/api/ai/chat', {
                      method: 'POST',
                      body: JSON.stringify({
                        system: 'You are a prompt enhancement specialist. Enhance the following image generation prompt to be more detailed, vivid, and likely to produce stunning results. Return ONLY the enhanced prompt, nothing else.',
                        message: prompt.trim(),
                      }),
                    })
                    const data = await res.json()
                    if (data.message || data.content || data.text) {
                      const enhanced = data.message || data.content || data.text
                      setPrompt(enhanced)
                      setEnhanceSuccess(true)
                      setTimeout(() => setEnhanceSuccess(false), 2000)
                    }
                  } catch {
                    // Silently fail - don't disrupt the user
                  } finally {
                    setEnhancing(false)
                  }
                }}
                disabled={!prompt.trim() || enhancing}
                className={`absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
                  enhanceSuccess
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : prompt.trim() && !enhancing
                      ? 'bg-nova-gold/15 text-nova-gold border border-nova-gold/30 hover:bg-nova-gold/25'
                      : 'bg-secondary/20 text-muted-foreground/50 border border-border cursor-not-allowed'
                }`}
              >
                {enhancing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                {enhanceSuccess ? 'Done!' : 'Enhance'}
              </motion.button>
            </div>
          </div>

          {/* Style Presets */}
          <div className="glass-card p-4 space-y-3">
            <label className="text-xs font-semibold text-nova-gold flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" />
              Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STYLE_PRESETS.map((preset) => (
                <motion.button
                  key={preset.name}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setStyle(preset.name)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    style === preset.name
                      ? 'bg-nova-gold/15 text-nova-gold border border-nova-gold/40 shadow-[0_0_8px_rgba(212,165,116,0.15)]'
                      : 'bg-secondary/30 text-muted-foreground border border-border hover:border-nova-gold/20 hover:text-foreground'
                  }`}
                >
                  {preset.name}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Size Selector */}
          <div className="glass-card p-4 space-y-3">
            <label className="text-xs font-semibold text-nova-gold">Size</label>
            <div className="relative">
              <button
                onClick={() => setShowSizeDropdown(!showSizeDropdown)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/30 border border-border hover:border-nova-gold/20 transition-colors"
              >
                <div className="text-left">
                  <p className="text-xs font-medium text-foreground">
                    {SIZE_OPTIONS.find(s => s.value === size)?.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {SIZE_OPTIONS.find(s => s.value === size)?.description}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              <AnimatePresence>
                {showSizeDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute top-full left-0 right-0 mt-1 z-10 glass-card border border-nova-gold/20 overflow-hidden"
                  >
                    {SIZE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setSize(opt.value); setShowSizeDropdown(false) }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-nova-gold/5 transition-colors ${
                          size === opt.value ? 'bg-nova-gold/10' : ''
                        }`}
                      >
                        <div>
                          <p className="text-xs font-medium text-foreground">{opt.label}</p>
                          <p className="text-[10px] text-muted-foreground">{opt.description}</p>
                        </div>
                        {size === opt.value && (
                          <div className="w-2 h-2 rounded-full bg-nova-gold" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
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
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate Image
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

        {/* Right Panel - Image Display + History */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Generated Image */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {generatedImage ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-4 h-fit"
              >
                <div className="relative group">
                  <img
                    src={`data:image/png;base64,${generatedImage.image}`}
                    alt={generatedImage.prompt}
                    className="w-full rounded-lg cursor-pointer"
                    onClick={() => setLightboxImage(generatedImage.image)}
                  />
                  {/* Overlay actions */}
                  <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setLightboxImage(generatedImage.image)}
                      className="p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:border-nova-gold/30 transition-colors"
                      title="Zoom"
                    >
                      <ZoomIn className="w-4 h-4 text-foreground" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDownload(generatedImage.image, `nova-${generatedImage.id}`)}
                      className="p-2 rounded-lg bg-background/80 backdrop-blur-sm border border-border hover:border-nova-gold/30 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-foreground" />
                    </motion.button>
                  </div>
                </div>

                {/* Image Info */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-nova-gold" />
                      <span className="text-xs font-medium text-nova-gold">{generatedImage.style}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{generatedImage.size}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{generatedImage.prompt}</p>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleDownload(generatedImage.image, `nova-${generatedImage.id}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-card text-xs text-foreground hover:border-nova-gold/30 hover:text-nova-gold transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Download PNG
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setPrompt(generatedImage.prompt)
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-card text-xs text-foreground hover:border-nova-gold/30 hover:text-nova-gold transition-colors"
                    >
                      <Wand2 className="w-3 h-3" />
                      Regenerate
                    </motion.button>
                  </div>
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
                    <ImageIcon className="w-10 h-10 text-nova-gold/50" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground mb-1">No image generated yet</p>
                  <p className="text-xs text-muted-foreground/60">Enter a prompt and click Generate</p>
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
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {history.map((img) => (
                    <motion.div
                      key={img.id}
                      whileHover={{ scale: 1.05 }}
                      className="relative group cursor-pointer"
                      onClick={() => handleHistoryImageClick(img)}
                    >
                      <img
                        src={`data:image/png;base64,${img.image}`}
                        alt={img.prompt}
                        className="w-full aspect-square object-cover rounded-lg border border-border group-hover:border-nova-gold/30 transition-colors"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                        <ZoomIn className="w-4 h-4 text-white" />
                      </div>
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
              onClick={(e) => { e.stopPropagation(); handleDownload(lightboxImage, 'nova-image') }}
              className="absolute top-4 right-16 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-10"
            >
              <Download className="w-5 h-5 text-white" />
            </motion.button>
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={`data:image/png;base64,${lightboxImage}`}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
