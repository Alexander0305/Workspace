import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  password: z.string().min(8).max(128),
  name: z.string().max(100).optional(),
})

export const chatSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().optional(),
  personality: z.enum(['nova', 'athena', 'aria', 'zeus']).optional(),
  ragContext: z.string().max(5000).optional(),
})

export const taskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['todo', 'in-progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().optional(),
})

export const noteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(50000),
  category: z.string().max(50).optional(),
})

export const knowledgeSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(100000),
  category: z.string().max(50),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export const passwordEntrySchema = z.object({
  name: z.string().min(1).max(200),
  username: z.string().max(200),
  password: z.string().min(1).max(500),
  url: z.string().url().optional().or(z.literal('')),
  category: z.string().max(50).optional(),
})

export const settingsSchema = z.object({
  key: z.string().max(100).regex(/^[a-zA-Z0-9_.-]+$/),
  value: z.string().max(10000),
})

export const featureFlagSchema = z.object({
  key: z.string().max(100).regex(/^[a-zA-Z0-9_.-]+$/),
  name: z.string().max(200),
  description: z.string().max(1000),
  category: z.string().max(100),
  enabled: z.boolean().optional(),
  configurable: z.boolean().optional(),
  requiresRestart: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const executeSchema = z.object({
  code: z.string().max(10240), // 10KB max
  language: z.enum(['javascript', 'typescript']).optional(),
})

export const imageGenSchema = z.object({
  prompt: z.string().min(1).max(2000),
  size: z.enum(['1024x1024', '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440']).optional(),
})

export const webSearchSchema = z.object({
  query: z.string().min(1).max(500),
  num: z.number().int().min(1).max(20).optional(),
})

export const apiKeySchema = z.object({
  provider: z.string().max(50),
  apiKey: z.string().min(1).max(500),
  apiSecret: z.string().max(500).optional(),
  baseUrl: z.string().url().optional().or(z.literal('')),
  label: z.string().max(100).optional(),
})

// ─── Helper Functions ───────────────────────────────────────────────────────

/**
 * Sanitize a string to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Strip HTML tags from a string
 */
export function stripHtml(input: string): string {
  if (typeof input !== 'string') return ''
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean
  score: number
  errors: string[]
} {
  const errors: string[] = []
  let score = 0

  if (password.length >= 8) score++
  else errors.push('Password must be at least 8 characters')
  
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  else errors.push('Add an uppercase letter')
  
  if (/[a-z]/.test(password)) score++
  else errors.push('Add a lowercase letter')
  
  if (/[0-9]/.test(password)) score++
  else errors.push('Add a number')
  
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
  else errors.push('Add a special character')

  return { valid: errors.length === 0, score: Math.min(score, 5), errors }
}

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 255)
}

/**
 * Generate a slug from a string
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + '...'
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}
