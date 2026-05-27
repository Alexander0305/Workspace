export interface AIProvider {
  id: string
  name: string
  description: string
  icon: string // lucide icon name
  website: string
  apiKeyLabel: string
  apiSecretLabel?: string
  baseUrl?: string
  defaultBaseUrl: string
  supportedModels: Array<{ id: string; name: string; tier: string }>
  minTier: string
  category: 'chat' | 'image' | 'audio' | 'embedding' | 'multimodal'
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4, GPT-3.5, DALL-E, Whisper',
    icon: 'Zap',
    website: 'https://platform.openai.com',
    apiKeyLabel: 'API Key',
    defaultBaseUrl: 'https://api.openai.com/v1',
    supportedModels: [
      { id: 'gpt-4o', name: 'GPT-4o', tier: 'pro' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'basic' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', tier: 'pro' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', tier: 'free' },
      { id: 'dall-e-3', name: 'DALL-E 3', tier: 'pro' },
      { id: 'whisper-1', name: 'Whisper', tier: 'basic' },
    ],
    minTier: 'free',
    category: 'chat',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku',
    icon: 'Brain',
    website: 'https://console.anthropic.com',
    apiKeyLabel: 'API Key',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    supportedModels: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', tier: 'pro' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', tier: 'enterprise' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', tier: 'free' },
    ],
    minTier: 'free',
    category: 'chat',
  },
  {
    id: 'google',
    name: 'Google AI (Gemini)',
    description: 'Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini Pro Vision',
    icon: 'Sparkles',
    website: 'https://ai.google.dev',
    apiKeyLabel: 'API Key',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1',
    supportedModels: [
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', tier: 'pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', tier: 'basic' },
      { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', tier: 'pro' },
    ],
    minTier: 'free',
    category: 'multimodal',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    description: 'Command R+, Embed, Rerank',
    icon: 'MessageSquare',
    website: 'https://dashboard.cohere.com',
    apiKeyLabel: 'API Key',
    defaultBaseUrl: 'https://api.cohere.ai/v1',
    supportedModels: [
      { id: 'command-r-plus', name: 'Command R+', tier: 'pro' },
      { id: 'command-r', name: 'Command R', tier: 'basic' },
      { id: 'embed-english-v3.0', name: 'Embed English v3', tier: 'free' },
    ],
    minTier: 'free',
    category: 'chat',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Mistral Large, Mistral Medium, Mistral Small, Codestral',
    icon: 'Wind',
    website: 'https://console.mistral.ai',
    apiKeyLabel: 'API Key',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    supportedModels: [
      { id: 'mistral-large-latest', name: 'Mistral Large', tier: 'pro' },
      { id: 'mistral-medium-latest', name: 'Mistral Medium', tier: 'basic' },
      { id: 'mistral-small-latest', name: 'Mistral Small', tier: 'free' },
      { id: 'codestral-latest', name: 'Codestral', tier: 'pro' },
    ],
    minTier: 'free',
    category: 'chat',
  },
  {
    id: 'meta',
    name: 'Meta (via Together AI)',
    description: 'Llama 3.1 405B, Llama 3.1 70B, Llama 3.1 8B',
    icon: 'Globe',
    website: 'https://api.together.xyz',
    apiKeyLabel: 'Together AI Key',
    defaultBaseUrl: 'https://api.together.xyz/v1',
    supportedModels: [
      { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', name: 'Llama 3.1 405B', tier: 'enterprise' },
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B', tier: 'pro' },
      { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', name: 'Llama 3.1 8B', tier: 'free' },
    ],
    minTier: 'free',
    category: 'chat',
  },
  {
    id: 'stability',
    name: 'Stability AI',
    description: 'Stable Diffusion XL, Stable Image Ultra, Stable Diffusion 3',
    icon: 'ImageIcon',
    website: 'https://platform.stability.ai',
    apiKeyLabel: 'API Key',
    defaultBaseUrl: 'https://api.stability.ai/v1',
    supportedModels: [
      { id: 'stable-diffusion-xl-1.0', name: 'SDXL 1.0', tier: 'basic' },
      { id: 'stable-image-ultra', name: 'Stable Image Ultra', tier: 'pro' },
      { id: 'stable-diffusion-3', name: 'SD3', tier: 'pro' },
    ],
    minTier: 'basic',
    category: 'image',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Voice synthesis and cloning',
    icon: 'Mic',
    website: 'https://elevenlabs.io',
    apiKeyLabel: 'API Key',
    defaultBaseUrl: 'https://api.elevenlabs.io/v1',
    supportedModels: [
      { id: 'eleven_multilingual_v2', name: 'Multilingual v2', tier: 'basic' },
      { id: 'eleven_monolingual_v1', name: 'English v1', tier: 'free' },
    ],
    minTier: 'free',
    category: 'audio',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Open source models hub - thousands of free models',
    icon: 'Smile',
    website: 'https://huggingface.co',
    apiKeyLabel: 'Access Token',
    defaultBaseUrl: 'https://api-inference.huggingface.co/models',
    supportedModels: [
      { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', tier: 'free' },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B v0.3', tier: 'free' },
      { id: 'google/gemma-2-9b-it', name: 'Gemma 2 9B', tier: 'free' },
    ],
    minTier: 'free',
    category: 'chat',
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast LLM inference - LPU acceleration',
    icon: 'Zap',
    website: 'https://console.groq.com',
    apiKeyLabel: 'API Key',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    supportedModels: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', tier: 'free' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', tier: 'free' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', tier: 'free' },
    ],
    minTier: 'free',
    category: 'chat',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek V2.5 - high quality coding and reasoning',
    icon: 'Search',
    website: 'https://platform.deepseek.com',
    apiKeyLabel: 'API Key',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    supportedModels: [
      { id: 'deepseek-chat', name: 'DeepSeek V2.5', tier: 'free' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', tier: 'free' },
    ],
    minTier: 'free',
    category: 'chat',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run LLMs locally - complete privacy, no API costs',
    icon: 'Server',
    website: 'https://ollama.ai',
    apiKeyLabel: 'Not required',
    defaultBaseUrl: 'http://localhost:11434/api',
    supportedModels: [
      { id: 'llama3.1', name: 'Llama 3.1', tier: 'free' },
      { id: 'mistral', name: 'Mistral', tier: 'free' },
      { id: 'codellama', name: 'Code Llama', tier: 'free' },
    ],
    minTier: 'free',
    category: 'chat',
  },
]

export function getProviderById(id: string): AIProvider | undefined {
  return AI_PROVIDERS.find((p) => p.id === id)
}

export function getProvidersByCategory(category: string): AIProvider[] {
  return AI_PROVIDERS.filter((p) => p.category === category)
}

export function canUseProvider(tier: string, provider: AIProvider): boolean {
  const tierOrder = ['free', 'basic', 'pro', 'enterprise', 'unlimited']
  return tierOrder.indexOf(tier) >= tierOrder.indexOf(provider.minTier)
}
