'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookTemplate,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  Sparkles,
  PenTool,
  Code,
  BarChart3,
  Lightbulb,
  Briefcase,
  GraduationCap,
  Copy,
  Check,
  X,
  Save,
  MessageSquare,
  Braces,
} from 'lucide-react'
import { useNovaStore } from '@/lib/nova-store'

interface PromptTemplate {
  id: string
  name: string
  description: string
  category: string
  prompt: string
  variables: string[]
  isCustom?: boolean
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  Writing: { icon: PenTool, color: 'text-pink-400', label: 'Writing' },
  Coding: { icon: Code, color: 'text-emerald-400', label: 'Coding' },
  Analysis: { icon: BarChart3, color: 'text-nova-gold', label: 'Analysis' },
  Creative: { icon: Lightbulb, color: 'text-violet-400', label: 'Creative' },
  Business: { icon: Briefcase, color: 'text-sky-400', label: 'Business' },
  Education: { icon: GraduationCap, color: 'text-amber-400', label: 'Education' },
}

const BUILT_IN_TEMPLATES: Omit<PromptTemplate, 'id'>[] = [
  {
    name: 'Blog Post Writer',
    description: 'Write an engaging blog post on any topic',
    category: 'Writing',
    prompt: 'Write a comprehensive blog post about {topic}. The post should be {tone} in tone, approximately {word_count} words long, and include a compelling introduction, well-structured body paragraphs with examples, and a thought-provoking conclusion.',
    variables: ['topic', 'tone', 'word_count'],
  },
  {
    name: 'Email Composer',
    description: 'Compose a professional email',
    category: 'Writing',
    prompt: 'Compose a {tone} email to {recipient} regarding {subject}. The email should be concise, professional, and clearly communicate the following points: {key_points}. End with an appropriate call to action.',
    variables: ['tone', 'recipient', 'subject', 'key_points'],
  },
  {
    name: 'Code Reviewer',
    description: 'Get a thorough code review',
    category: 'Coding',
    prompt: 'Review the following {language} code and provide detailed feedback on: 1) Code quality and readability 2) Potential bugs or edge cases 3) Performance optimizations 4) Security vulnerabilities 5) Best practices. Here is the code:\n\n```\n{code}\n```',
    variables: ['language', 'code'],
  },
  {
    name: 'Function Generator',
    description: 'Generate a function from a description',
    category: 'Coding',
    prompt: 'Write a {language} function that {description}. The function should handle edge cases, include proper error handling, and follow {language} best practices. Include type hints and docstrings.',
    variables: ['language', 'description'],
  },
  {
    name: 'API Design',
    description: 'Design a REST API endpoint',
    category: 'Coding',
    prompt: 'Design a REST API endpoint for {resource} in a {project_type} application. Include: HTTP method, URL structure, request/response schemas (in JSON), authentication requirements, error responses, and pagination if needed. Follow {framework} conventions.',
    variables: ['resource', 'project_type', 'framework'],
  },
  {
    name: 'Data Analysis',
    description: 'Analyze data and provide insights',
    category: 'Analysis',
    prompt: 'Analyze the following dataset/information about {subject} and provide: 1) Key statistical insights 2) Trends and patterns 3) Anomalies or outliers 4) Actionable recommendations 5) Visualizations to consider. Data: {data}',
    variables: ['subject', 'data'],
  },
  {
    name: 'SWOT Analysis',
    description: 'Perform a SWOT analysis',
    category: 'Analysis',
    prompt: 'Perform a comprehensive SWOT analysis for {subject}. For each quadrant (Strengths, Weaknesses, Opportunities, Threats), provide at least 5 detailed points with explanations. Then suggest strategic actions based on the analysis.',
    variables: ['subject'],
  },
  {
    name: 'Competitor Analysis',
    description: 'Analyze competitors in a market',
    category: 'Analysis',
    prompt: 'Conduct a detailed competitor analysis for {company} in the {industry} industry. Compare against top 3-5 competitors on: product features, pricing, market positioning, strengths, weaknesses, and market share trends. Provide strategic recommendations.',
    variables: ['company', 'industry'],
  },
  {
    name: 'Story Creator',
    description: 'Create an engaging short story',
    category: 'Creative',
    prompt: 'Write a {genre} short story set in {setting}. The main character is {character_description}. The story should explore the theme of {theme} and include a surprising plot twist. Length: approximately {word_count} words.',
    variables: ['genre', 'setting', 'character_description', 'theme', 'word_count'],
  },
  {
    name: 'Poem Generator',
    description: 'Generate poetry in various styles',
    category: 'Creative',
    prompt: 'Write a {style} poem about {subject}. The poem should evoke feelings of {mood} and use vivid imagery. Include {literary_devices} if appropriate. Length: {stanzas} stanzas.',
    variables: ['style', 'subject', 'mood', 'literary_devices', 'stanzas'],
  },
  {
    name: 'Brainstorming Session',
    description: 'Brainstorm creative ideas',
    category: 'Creative',
    prompt: 'Generate {count} creative and innovative ideas for {challenge}. For each idea, provide: 1) A catchy name 2) Brief description 3) Key benefits 4) Potential challenges 5) Implementation difficulty (1-5). Think outside the box and consider unconventional approaches.',
    variables: ['count', 'challenge'],
  },
  {
    name: 'Business Plan Outline',
    description: 'Create a business plan framework',
    category: 'Business',
    prompt: 'Create a comprehensive business plan outline for {business_idea} in the {industry} sector. Include: Executive Summary, Market Analysis, Competitive Landscape, Business Model, Revenue Streams, Marketing Strategy, Operations Plan, Financial Projections, Risk Assessment, and Timeline.',
    variables: ['business_idea', 'industry'],
  },
  {
    name: 'Pitch Deck Script',
    description: 'Write a startup pitch script',
    category: 'Business',
    prompt: 'Write a compelling {duration}-minute pitch deck script for {startup_name}, a {product_description}. Include slides for: Problem, Solution, Market Size, Business Model, Traction, Team, Competition, and Ask. Make it persuasive and memorable.',
    variables: ['duration', 'startup_name', 'product_description'],
  },
  {
    name: 'Meeting Agenda',
    description: 'Create a structured meeting agenda',
    category: 'Business',
    prompt: 'Create a structured meeting agenda for a {meeting_type} meeting about {topic}. Duration: {duration}. Attendees: {attendees}. Include time allocations, discussion items, decision items, action items template, and next steps.',
    variables: ['meeting_type', 'topic', 'duration', 'attendees'],
  },
  {
    name: 'Lesson Plan',
    description: 'Design an educational lesson plan',
    category: 'Education',
    prompt: 'Design a detailed lesson plan for teaching {subject} to {grade_level} students. Duration: {duration}. Include: learning objectives, materials needed, warm-up activity, main instruction (with differentiation strategies), practice activities, assessment methods, and homework assignment.',
    variables: ['subject', 'grade_level', 'duration'],
  },
  {
    name: 'Quiz Generator',
    description: 'Generate educational quiz questions',
    category: 'Education',
    prompt: 'Generate {count} quiz questions about {topic} at {difficulty} difficulty level. Include a mix of: multiple choice, true/false, short answer, and one essay question. Provide the correct answers and brief explanations for each.',
    variables: ['count', 'topic', 'difficulty'],
  },
  {
    name: 'Concept Explainer',
    description: 'Explain a complex concept simply',
    category: 'Education',
    prompt: 'Explain the concept of {concept} in simple terms that a {audience} could understand. Use the Feynman technique: start with a simple explanation, then identify gaps, and refine. Include analogies, examples, and a simple diagram description.',
    variables: ['concept', 'audience'],
  },
  {
    name: 'Documentation Writer',
    description: 'Write technical documentation',
    category: 'Coding',
    prompt: 'Write comprehensive technical documentation for {feature} in a {project_type} project. Include: Overview, Installation, Quick Start Guide, API Reference, Configuration Options, Examples, Troubleshooting, FAQ, and Changelog.',
    variables: ['feature', 'project_type'],
  },
  {
    name: 'SQL Query Builder',
    description: 'Build complex SQL queries',
    category: 'Coding',
    prompt: 'Write an optimized SQL query for {database_type} that {requirement}. Include: the query with proper joins, subqueries if needed, appropriate indexes to create, performance considerations, and alternative approaches.',
    variables: ['database_type', 'requirement'],
  },
  {
    name: 'Marketing Copy',
    description: 'Write persuasive marketing copy',
    category: 'Business',
    prompt: 'Write compelling marketing copy for {product} targeting {audience}. The copy should emphasize {key_benefit} and include: a attention-grabbing headline, a sub-headline, body copy with social proof, and a strong call to action. Tone: {tone}.',
    variables: ['product', 'audience', 'key_benefit', 'tone'],
  },
  {
    name: 'Debate Prep',
    description: 'Prepare arguments for a debate',
    category: 'Education',
    prompt: 'Prepare debate arguments {position} the topic: "{topic}". Provide: 1) Opening statement 2) Three strongest arguments with evidence 3) Anticipated counter-arguments and rebuttals 4) Closing statement 5) Key statistics or quotes to reference.',
    variables: ['position', 'topic'],
  },
  {
    name: 'Regex Generator',
    description: 'Generate regular expressions',
    category: 'Coding',
    prompt: 'Create a regular expression that matches {pattern_description}. Provide: 1) The regex with explanation of each part 2) Test cases (matches and non-matches) 3) Common variations 4) Implementation in JavaScript and Python.',
    variables: ['pattern_description'],
  },
]

export function PromptTemplatesView() {
  const { addMessage, setActiveView } = useNovaStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [customTemplates, setCustomTemplates] = useState<Omit<PromptTemplate, 'id'>[]>([])
  const [showNewTemplate, setShowNewTemplate] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ name: '', description: '', category: 'Custom', prompt: '' })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Extract variables from template prompt
  const extractVariables = (prompt: string): string[] => {
    const matches = prompt.match(/\{([^}]+)\}/g)
    return matches ? matches.map(m => m.slice(1, -1)) : []
  }

  const allTemplates = useMemo(() => {
    const builtIn = BUILT_IN_TEMPLATES.map((t, i) => ({
      ...t,
      id: `builtin-${i}`,
      variables: extractVariables(t.prompt),
    }))
    const custom = customTemplates.map((t, i) => ({
      ...t,
      id: `custom-${i}`,
      variables: extractVariables(t.prompt),
      isCustom: true,
    }))
    return [...builtIn, ...custom]
  }, [customTemplates])

  const filteredTemplates = useMemo(() => {
    let filtered = allTemplates
    if (activeCategory) {
      filtered = filtered.filter(t => t.category === activeCategory)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    }
    return filtered
  }, [allTemplates, activeCategory, searchQuery])

  const handleTemplateClick = (template: PromptTemplate) => {
    setSelectedTemplate(template)
    setVariableValues({})
  }

  const handleVariableChange = (variable: string, value: string) => {
    setVariableValues(prev => ({ ...prev, [variable]: value }))
  }

  const getFilledPrompt = (template: PromptTemplate): string => {
    let filled = template.prompt
    for (const [key, value] of Object.entries(variableValues)) {
      filled = filled.replaceAll(`{${key}}`, value || `{${key}}`)
    }
    return filled
  }

  const areAllVariablesFilled = (template: PromptTemplate): boolean => {
    return template.variables.every(v => variableValues[v]?.trim())
  }

  const handleSendToChat = () => {
    if (!selectedTemplate) return
    const prompt = getFilledPrompt(selectedTemplate)
    addMessage({
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    })
    setActiveView('chat')
  }

  const handleCopyPrompt = (template: PromptTemplate) => {
    const prompt = selectedTemplate?.id === template.id ? getFilledPrompt(template) : template.prompt
    navigator.clipboard.writeText(prompt)
    setCopiedId(template.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSaveCustomTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.prompt.trim()) return
    setCustomTemplates(prev => [...prev, {
      name: newTemplate.name.trim(),
      description: newTemplate.description.trim() || 'Custom template',
      category: 'Custom',
      prompt: newTemplate.prompt.trim(),
    }])
    setNewTemplate({ name: '', description: '', category: 'Custom', prompt: '' })
    setShowNewTemplate(false)
  }

  const handleDeleteCustomTemplate = (index: number) => {
    setCustomTemplates(prev => prev.filter((_, i) => i !== index))
  }

  const categories = useMemo(() => {
    const cats = new Set(allTemplates.map(t => t.category))
    return Array.from(cats)
  }, [allTemplates])

  return (
    <div className="h-full flex flex-col p-4 lg:p-6 overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nova-gold/20 to-nova-gold/10 flex items-center justify-center border border-nova-gold/30">
              <BookTemplate className="w-5 h-5 text-nova-gold" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Prompt Templates</h2>
              <p className="text-xs text-muted-foreground">Pre-built prompts for common tasks</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNewTemplate(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass-card text-xs font-medium text-nova-gold hover:border-nova-gold/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Custom Template
          </motion.button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-4"
      >
        <div className="glass-card p-2">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-nova-gold flex-shrink-0 ml-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>
        </div>
      </motion.div>

      {/* Category Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-4 flex gap-2 overflow-x-auto pb-1"
      >
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setActiveCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            !activeCategory
              ? 'bg-nova-gold/15 text-nova-gold border border-nova-gold/40'
              : 'glass-card text-muted-foreground hover:text-foreground'
          }`}
        >
          All ({allTemplates.length})
        </motion.button>
        {categories.map(cat => {
          const config = CATEGORY_CONFIG[cat]
          const Icon = config?.icon || Braces
          const count = allTemplates.filter(t => t.category === cat).length
          return (
            <motion.button
              key={cat}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-nova-gold/15 text-nova-gold border border-nova-gold/40'
                  : 'glass-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3 h-3" />
              {cat} ({count})
            </motion.button>
          )
        })}
      </motion.div>

      {/* Content Area */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">
        {/* Template List */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          <div className="grid gap-3">
            {filteredTemplates.map((template, index) => {
              const config = CATEGORY_CONFIG[template.category]
              const Icon = config?.icon || Braces
              const isSelected = selectedTemplate?.id === template.id

              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleTemplateClick(template)}
                  className={`glass-card p-4 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-nova-gold/40 shadow-[0_0_12px_rgba(212,165,116,0.15)]'
                      : 'hover:border-nova-gold/20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-nova-gold/15' : 'bg-secondary/30'
                    }`}>
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-nova-gold' : config?.color || 'text-muted-foreground'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-semibold ${isSelected ? 'text-nova-gold' : 'text-foreground'}`}>
                          {template.name}
                        </h3>
                        {template.isCustom && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-nova-gold/10 text-nova-gold border border-nova-gold/20">
                            Custom
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{template.description}</p>
                      {template.variables.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {template.variables.map(v => (
                            <span key={v} className="px-1.5 py-0.5 rounded text-[10px] bg-secondary/30 text-muted-foreground border border-border">
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); handleCopyPrompt(template) }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-nova-gold hover:bg-nova-gold/10 transition-colors"
                        title="Copy prompt"
                      >
                        {copiedId === template.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </motion.button>
                      <ChevronRight className={`w-4 h-4 transition-colors ${isSelected ? 'text-nova-gold' : 'text-muted-foreground/50'}`} />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">No templates found</p>
            </div>
          )}
        </div>

        {/* Template Detail / Variable Filler */}
        <AnimatePresence>
          {selectedTemplate && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 360 }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0 glass-card overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-nova-gold" />
                  <span className="text-sm font-semibold text-foreground">{selectedTemplate.name}</span>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>

                {/* Variables */}
                {selectedTemplate.variables.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-nova-gold flex items-center gap-1.5">
                      <Braces className="w-3.5 h-3.5" />
                      Fill Variables
                    </label>
                    {selectedTemplate.variables.map(variable => (
                      <div key={variable}>
                        <label className="text-[10px] text-muted-foreground mb-1 block">{variable}</label>
                        <input
                          type="text"
                          value={variableValues[variable] || ''}
                          onChange={(e) => handleVariableChange(variable, e.target.value)}
                          placeholder={`Enter ${variable}...`}
                          className="w-full bg-secondary/20 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-nova-gold/30 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Preview */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-nova-gold">Preview</label>
                  <div className="p-3 rounded-lg bg-secondary/20 border border-border">
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {getFilledPrompt(selectedTemplate).split(/(\{[^}]+\})/g).map((part, i) => {
                        if (part.match(/^\{[^}]+\}$/)) {
                          return (
                            <span key={i} className="text-nova-gold bg-nova-gold/10 px-1 rounded font-medium">
                              {part}
                            </span>
                          )
                        }
                        return <span key={i}>{part}</span>
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border space-y-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSendToChat}
                  disabled={selectedTemplate.variables.length > 0 && !areAllVariablesFilled(selectedTemplate)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    selectedTemplate.variables.length === 0 || areAllVariablesFilled(selectedTemplate)
                      ? 'gold-gradient-bg text-background shadow-[0_0_10px_rgba(212,165,116,0.3)]'
                      : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Send to Chat
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCopyPrompt(selectedTemplate)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl glass-card text-xs text-foreground hover:text-nova-gold hover:border-nova-gold/30 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy Prompt
                </motion.button>
                {selectedTemplate.isCustom && (
                  <button
                    onClick={() => {
                      const idx = parseInt(selectedTemplate.id.replace('custom-', ''))
                      handleDeleteCustomTemplate(idx)
                      setSelectedTemplate(null)
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Template
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New Custom Template Modal */}
      <AnimatePresence>
        {showNewTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
            onClick={() => setShowNewTemplate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card p-6 w-full max-w-lg space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Create Custom Template</h3>
                <button
                  onClick={() => setShowNewTemplate(false)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Template Name</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Bug Report Template"
                    className="w-full bg-secondary/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-nova-gold/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                  <input
                    type="text"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this template"
                    className="w-full bg-secondary/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-nova-gold/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Prompt Template</label>
                  <p className="text-[10px] text-muted-foreground/60 mb-1">Use {'{variable_name}'} syntax for placeholders</p>
                  <textarea
                    value={newTemplate.prompt}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Write your prompt template here. Use {variable} for placeholders that users will fill in."
                    rows={6}
                    className="w-full bg-secondary/20 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none border border-border focus:border-nova-gold/30 transition-colors"
                  />
                </div>
                {newTemplate.prompt && extractVariables(newTemplate.prompt).length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground">Detected variables:</span>
                    {extractVariables(newTemplate.prompt).map(v => (
                      <span key={v} className="px-1.5 py-0.5 rounded text-[10px] bg-nova-gold/10 text-nova-gold border border-nova-gold/20">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveCustomTemplate}
                  disabled={!newTemplate.name.trim() || !newTemplate.prompt.trim()}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    newTemplate.name.trim() && newTemplate.prompt.trim()
                      ? 'gold-gradient-bg text-background shadow-[0_0_10px_rgba(212,165,116,0.3)]'
                      : 'bg-secondary/30 text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  Save Template
                </motion.button>
                <button
                  onClick={() => setShowNewTemplate(false)}
                  className="px-4 py-2.5 rounded-xl glass-card text-sm text-foreground hover:text-nova-gold hover:border-nova-gold/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
