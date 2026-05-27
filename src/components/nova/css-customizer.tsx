'use client'

import { motion } from 'framer-motion'
import { Palette, RotateCcw, Check } from 'lucide-react'
import { useState, useEffect } from 'react'

const PRESET_THEMES = [
  {
    id: 'midnight-gold',
    name: 'Midnight Gold',
    css: `:root {
  --background: #0a0a0a;
  --primary: #d4a574;
  --accent: #7c3aed;
}`,
  },
  {
    id: 'royal-purple',
    css: `:root {
  --background: #0a0a0a;
  --primary: #7c3aed;
  --accent: #a855f7;
}`,
    name: 'Royal Purple',
  },
  {
    id: 'obsidian',
    css: `:root {
  --background: #0a0a0a;
  --primary: #a0a0a0;
  --accent: #d4d4d4;
}`,
    name: 'Obsidian',
  },
]

interface CssCustomizerProps {
  css: string
  onApply: (css: string) => void
}

export function CssCustomizer({ css, onApply }: CssCustomizerProps) {
  const [editValue, setEditValue] = useState(css)
  const [activePreset, setActivePreset] = useState<string | null>(null)

  useEffect(() => {
    setEditValue(css)
  }, [css])

  const handleApply = () => {
    onApply(editValue)
  }

  const handleReset = () => {
    setEditValue('')
    onApply('')
    setActivePreset(null)
  }

  const handlePreset = (preset: typeof PRESET_THEMES[0]) => {
    setEditValue(preset.css)
    setActivePreset(preset.id)
  }

  return (
    <div className="glass-card p-4">
      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Palette className="w-4 h-4 text-nova-gold" />
        CSS Customizer
      </h4>

      {/* Theme presets */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {PRESET_THEMES.map(preset => (
          <motion.button
            key={preset.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePreset(preset)}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors ${
              activePreset === preset.id
                ? 'gold-gradient-bg text-background'
                : 'border border-border text-muted-foreground hover:text-nova-gold hover:border-nova-gold/30'
            }`}
          >
            {activePreset === preset.id && <Check className="w-3 h-3 inline mr-1" />}
            {preset.name}
          </motion.button>
        ))}
      </div>

      {/* Code editor */}
      <div className="relative">
        <textarea
          value={editValue}
          onChange={(e) => { setEditValue(e.target.value); setActivePreset(null) }}
          placeholder="/* Enter custom CSS here */&#10;:root {&#10;  --primary: #d4a574;&#10;}"
          rows={6}
          className="w-full bg-black/40 border border-border rounded-lg px-4 py-3 text-xs text-emerald-400 font-mono placeholder:text-muted-foreground/50 outline-none focus-gold resize-none"
          spellCheck={false}
        />
      </div>

      {/* Preview hint */}
      <p className="text-[10px] text-muted-foreground mt-2 mb-3">
        Changes will be applied to the entire interface. Use CSS variables for best results.
      </p>

      {/* Actions */}
      <div className="flex gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleApply}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gold-gradient-bg text-background text-xs font-medium"
        >
          <Check className="w-3 h-3" />
          Apply
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset
        </motion.button>
      </div>

      {/* Live preview area */}
      <div className="mt-3 p-3 rounded-lg border border-border bg-secondary/20">
        <p className="text-[10px] text-muted-foreground mb-1">Preview</p>
        <div
          className="p-3 rounded-lg text-xs"
          style={{ background: 'var(--background, #0a0a0a)' }}
        >
          <span style={{ color: 'var(--primary, #d4a574)' }}>Primary Color</span>
          {' · '}
          <span style={{ color: 'var(--accent, #7c3aed)' }}>Accent Color</span>
        </div>
      </div>
    </div>
  )
}
