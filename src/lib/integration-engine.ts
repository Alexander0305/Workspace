// Integration Engine - Auto-integrate open-source tools into NOVA

export interface IntegrationSource {
  id: string
  name: string
  description: string
  type: 'github' | 'gitlab' | 'sourceforge' | 'npm' | 'pypi' | 'custom_zip' | 'custom_url'
  url: string
  version: string
  author: string
  license: string
  category: string
  status: 'pending' | 'installing' | 'installed' | 'error' | 'disabled'
  installedAt?: Date
  error?: string
  config?: Record<string, unknown>
  featureFlagKey?: string // auto-created feature flag key
}

export interface IntegrationTemplate {
  id: string
  name: string
  description: string
  sourceUrl: string
  sourceType: IntegrationSource['type']
  category: string
  tags: string[]
  setupInstructions: string
  permissions: string[]
  estimatedSize: string
  popularity: number // stars/downloads
}

// Pre-curated integrations from popular open-source AI projects
export const CURATED_INTEGRATIONS: IntegrationTemplate[] = [
  {
    id: 'langchain',
    name: 'LangChain',
    description: 'Framework for developing applications powered by language models. Chain together LLM calls, tools, and data sources.',
    sourceUrl: 'https://github.com/langchain-ai/langchain',
    sourceType: 'github',
    category: 'AI Framework',
    tags: ['llm', 'chains', 'agents', 'rag', 'tools'],
    setupInstructions: 'LangChain provides a framework for building LLM-powered applications. In NOVA, it enables chain-of-thought reasoning, multi-step agent workflows, and tool use.',
    permissions: ['network', 'storage'],
    estimatedSize: '~5MB',
    popularity: 90000,
  },
  {
    id: 'autogpt',
    name: 'AutoGPT',
    description: 'An autonomous GPT-4 agent that chains together LLM thoughts to achieve goals autonomously.',
    sourceUrl: 'https://github.com/Significant-Gravitas/AutoGPT',
    sourceType: 'github',
    category: 'AI Agent',
    tags: ['agent', 'autonomous', 'gpt-4', 'self-prompting'],
    setupInstructions: 'AutoGPT enables autonomous task execution. The agent can break down complex goals into sub-tasks and execute them sequentially.',
    permissions: ['network', 'storage', 'files'],
    estimatedSize: '~15MB',
    popularity: 165000,
  },
  {
    id: 'llamacpp',
    name: 'LLaMA.cpp',
    description: 'Run LLaMA models locally with CPU/GPU inference. Complete privacy, no API calls needed.',
    sourceUrl: 'https://github.com/ggerganov/llama.cpp',
    sourceType: 'github',
    category: 'Local LLM',
    tags: ['local', 'llm', 'inference', 'privacy', 'cpu'],
    setupInstructions: 'LLaMA.cpp enables running large language models locally on your machine. Combined with Ollama, NOVA can use these models for completely private inference.',
    permissions: ['system', 'storage'],
    estimatedSize: '~50MB',
    popularity: 65000,
  },
  {
    id: 'whisper',
    name: 'OpenAI Whisper (Local)',
    description: 'Robust speech recognition model that runs locally for transcription and translation.',
    sourceUrl: 'https://github.com/openai/whisper',
    sourceType: 'github',
    category: 'Speech',
    tags: ['speech', 'transcription', 'translation', 'local', 'stt'],
    setupInstructions: 'Whisper provides local speech-to-text without sending audio to external servers. Supports 99 languages.',
    permissions: ['system', 'storage', 'microphone'],
    estimatedSize: '~3GB (with model)',
    popularity: 70000,
  },
  {
    id: 'stable-diffusion-webui',
    name: 'Stable Diffusion WebUI',
    description: 'A browser interface for Stable Diffusion - generate images locally with full control.',
    sourceUrl: 'https://github.com/AUTOMATIC1111/stable-diffusion-webui',
    sourceType: 'github',
    category: 'Image Generation',
    tags: ['image', 'stable-diffusion', 'local', 'generation'],
    setupInstructions: 'Run Stable Diffusion locally for private image generation without API calls. Supports ControlNet, LoRA, and custom models.',
    permissions: ['system', 'storage', 'gpu'],
    estimatedSize: '~10GB (with model)',
    popularity: 140000,
  },
  {
    id: 'crewai',
    name: 'CrewAI',
    description: 'Framework for orchestrating role-playing AI agents that work together as a crew.',
    sourceUrl: 'https://github.com/joaomdmoura/crewAI',
    sourceType: 'github',
    category: 'AI Agent',
    tags: ['agent', 'multi-agent', 'orchestration', 'collaboration'],
    setupInstructions: 'CrewAI enables multiple AI agents to collaborate on complex tasks. Each agent has a role, goal, and backstory.',
    permissions: ['network', 'storage'],
    estimatedSize: '~3MB',
    popularity: 18000,
  },
  {
    id: 'transformers',
    name: 'Hugging Face Transformers',
    description: 'State-of-the-art ML for PyTorch, TensorFlow, and JAX. Thousands of pretrained models.',
    sourceUrl: 'https://github.com/huggingface/transformers',
    sourceType: 'github',
    category: 'ML Framework',
    tags: ['transformers', 'bert', 'gpt', 'nlp', 'models'],
    setupInstructions: 'Transformers provides access to thousands of pretrained models for NLP, vision, and audio tasks.',
    permissions: ['network', 'storage', 'system'],
    estimatedSize: '~20MB',
    popularity: 135000,
  },
  {
    id: 'localai',
    name: 'LocalAI',
    description: 'OpenAI-compatible API for running LLMs locally. Drop-in replacement for OpenAI API.',
    sourceUrl: 'https://github.com/mudler/LocalAI',
    sourceType: 'github',
    category: 'Local LLM',
    tags: ['local', 'openai-compatible', 'api', 'inference'],
    setupInstructions: 'LocalAI provides an OpenAI-compatible API server that runs locally. NOVA can connect to it like any OpenAI endpoint.',
    permissions: ['network', 'system', 'storage'],
    estimatedSize: '~100MB',
    popularity: 25000,
  },
  {
    id: 'dify',
    name: 'Dify',
    description: 'Open-source LLM app development platform with RAG, agents, and workflow orchestration.',
    sourceUrl: 'https://github.com/langgenius/dify',
    sourceType: 'github',
    category: 'AI Platform',
    tags: ['rag', 'agents', 'workflow', 'platform', 'orchestration'],
    setupInstructions: 'Dify provides a visual workflow builder for LLM applications, including RAG pipelines and agent configurations.',
    permissions: ['network', 'storage'],
    estimatedSize: '~200MB',
    popularity: 40000,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run LLMs locally with a simple API. Supports Llama 3, Mistral, Gemma, and more.',
    sourceUrl: 'https://github.com/ollama/ollama',
    sourceType: 'github',
    category: 'Local LLM',
    tags: ['local', 'llm', 'api', 'simple', 'fast'],
    setupInstructions: 'Ollama provides the simplest way to run LLMs locally. NOVA connects to its API endpoint for private inference.',
    permissions: ['network', 'system', 'storage'],
    estimatedSize: '~500MB (with models)',
    popularity: 90000,
  },
  {
    id: 'flowise',
    name: 'Flowise',
    description: 'Drag-and-drop UI for building LLM flows and AI agents visually.',
    sourceUrl: 'https://github.com/FlowiseAI/Flowise',
    sourceType: 'github',
    category: 'AI Platform',
    tags: ['visual', 'flow', 'drag-drop', 'agents', 'llm'],
    setupInstructions: 'Flowise provides a visual builder for LLM workflows. Create complex AI pipelines without coding.',
    permissions: ['network', 'storage'],
    estimatedSize: '~150MB',
    popularity: 30000,
  },
  {
    id: 'anything-llm',
    name: 'AnythingLLM',
    description: 'All-in-one AI document chatbot with RAG, multi-user, and multiple LLM support.',
    sourceUrl: 'https://github.com/Mintplex-Labs/anything-llm',
    sourceType: 'github',
    category: 'RAG',
    tags: ['rag', 'document', 'chatbot', 'multi-user', 'enterprise'],
    setupInstructions: 'AnythingLLM provides enterprise-grade document chat with RAG. Supports multiple LLM providers and embedding models.',
    permissions: ['network', 'storage', 'files'],
    estimatedSize: '~100MB',
    popularity: 28000,
  },
  {
    id: 'openinterpreter',
    name: 'Open Interpreter',
    description: 'A natural language interface for computers. Let LLMs run code locally.',
    sourceUrl: 'https://github.com/OpenInterpreter/open-interpreter',
    sourceType: 'github',
    category: 'AI Agent',
    tags: ['code', 'interpreter', 'natural-language', 'computer-control'],
    setupInstructions: 'Open Interpreter allows LLMs to execute code on your computer using natural language commands.',
    permissions: ['system', 'network', 'storage', 'files'],
    estimatedSize: '~10MB',
    popularity: 55000,
  },
  {
    id: 'vocode',
    name: 'Vocode',
    description: 'Open-source voice AI framework for building voice bots and conversational AI.',
    sourceUrl: 'https://github.com/vocodedev/vocode-python',
    sourceType: 'github',
    category: 'Voice',
    tags: ['voice', 'telephony', 'conversation', 'tts', 'stt'],
    setupInstructions: 'Vocode enables building voice-based AI agents with real-time transcription and synthesis.',
    permissions: ['network', 'microphone', 'storage'],
    estimatedSize: '~5MB',
    popularity: 6000,
  },
  {
    id: 'mem0',
    name: 'Mem0',
    description: 'Layer for smart memory in AI applications. Persistent, contextual memory across sessions.',
    sourceUrl: 'https://github.com/mem0ai/mem0',
    sourceType: 'github',
    category: 'AI Memory',
    tags: ['memory', 'context', 'persistent', 'sessions'],
    setupInstructions: 'Mem0 provides persistent memory for AI. It remembers user preferences, past conversations, and contextual information across sessions.',
    permissions: ['network', 'storage'],
    estimatedSize: '~2MB',
    popularity: 25000,
  },
]

/** Detect source type from URL */
export function detectSourceType(url: string): IntegrationSource['type'] {
  const lower = url.toLowerCase()
  if (lower.includes('github.com')) return 'github'
  if (lower.includes('gitlab.com')) return 'gitlab'
  if (lower.includes('sourceforge.net')) return 'sourceforge'
  if (lower.includes('npmjs.com') || lower.includes('npmjs.org')) return 'npm'
  if (lower.includes('pypi.org') || lower.includes('pypi.io')) return 'pypi'
  return 'custom_url'
}

/** Extract GitHub owner/repo from URL */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') }
}

/** Fetch GitHub repository information */
export async function fetchGitHubRepoInfo(owner: string, repo: string): Promise<{
  name: string
  description: string
  stars: number
  license: string
  author: string
  language: string
  topics: string[]
}> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`)
    }

    const data = await res.json()
    return {
      name: data.name || repo,
      description: data.description || 'No description available',
      stars: data.stargazers_count || 0,
      license: data.license?.spdx_id || data.license?.name || 'Unknown',
      author: data.owner?.login || owner,
      language: data.language || 'Unknown',
      topics: data.topics || [],
    }
  } catch {
    // Return basic info if API fails
    return {
      name: repo,
      description: 'Could not fetch repository info from GitHub API',
      stars: 0,
      license: 'Unknown',
      author: owner,
      language: 'Unknown',
      topics: [],
    }
  }
}

/** Generate a feature flag key for an integration */
export function generateFeatureFlagKey(integrationId: string): string {
  return `integration.${integrationId}`
}

/** Format popularity number for display */
export function formatPopularity(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return String(num)
}

/** Get all unique categories from curated integrations */
export function getIntegrationCategories(): string[] {
  const categories = new Set(CURATED_INTEGRATIONS.map(i => i.category))
  return Array.from(categories).sort()
}

/** Search curated integrations */
export function searchIntegrations(query: string, category?: string): IntegrationTemplate[] {
  let results = CURATED_INTEGRATIONS

  if (category && category !== 'All') {
    results = results.filter(i => i.category === category)
  }

  if (query.trim()) {
    const q = query.toLowerCase()
    results = results.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.description.toLowerCase().includes(q) ||
      i.tags.some(t => t.toLowerCase().includes(q)) ||
      i.category.toLowerCase().includes(q)
    )
  }

  return results
}

/** Parse zip file metadata (simulated - reads basic info from the file name/size) */
export function analyzeZipFile(fileName: string, fileSize: number): {
  name: string
  description: string
  category: string
  type: IntegrationSource['type']
} {
  const baseName = fileName.replace(/\.zip$/i, '').replace(/[-_]/g, ' ')

  // Try to detect type from filename
  let category = 'Custom'
  const lowerName = baseName.toLowerCase()

  if (lowerName.includes('llm') || lowerName.includes('gpt') || lowerName.includes('model') || lowerName.includes('ai')) {
    category = 'AI Framework'
  } else if (lowerName.includes('agent') || lowerName.includes('auto')) {
    category = 'AI Agent'
  } else if (lowerName.includes('rag') || lowerName.includes('document') || lowerName.includes('search')) {
    category = 'RAG'
  } else if (lowerName.includes('voice') || lowerName.includes('speech') || lowerName.includes('whisper') || lowerName.includes('tts')) {
    category = 'Speech'
  } else if (lowerName.includes('image') || lowerName.includes('diffusion') || lowerName.includes('stable')) {
    category = 'Image Generation'
  } else if (lowerName.includes('memory') || lowerName.includes('mem')) {
    category = 'AI Memory'
  } else if (lowerName.includes('workflow') || lowerName.includes('flow') || lowerName.includes('pipeline')) {
    category = 'AI Platform'
  }

  const sizeMB = (fileSize / (1024 * 1024)).toFixed(1)

  return {
    name: baseName.replace(/\b\w/g, c => c.toUpperCase()),
    description: `Custom integration uploaded from ${fileName} (${sizeMB} MB)`,
    category,
    type: 'custom_zip',
  }
}
