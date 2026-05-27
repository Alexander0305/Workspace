/**
 * Server-side API key encryption utility
 * Uses AES-256-GCM via Node.js crypto module for encrypting API keys at rest.
 */

import crypto from 'crypto'

const DEFAULT_KEY = 'nova-default-encryption-key-change-in-production-32ch'

// Lazy initialization to avoid build-time errors
let _encryptionKey: string | null = null

function getEncryptionKey(): string {
  if (_encryptionKey) return _encryptionKey
  
  const key = process.env.API_KEY_ENCRYPTION_KEY || DEFAULT_KEY
  
  // Security: Warn about default key usage in production (but don't crash during build)
  if (process.env.NODE_ENV === 'production' && key === DEFAULT_KEY) {
    console.error('[SECURITY] API_KEY_ENCRYPTION_KEY must be set in production! Using the default key is a critical security vulnerability.')
    // Only throw at runtime when actually encrypting/decrypting, not during module load
  }
  
  _encryptionKey = key
  return _encryptionKey
}
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const SALT_LENGTH = 32

function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.scryptSync(secret, salt, 32)
}

/**
 * Validate encryption key at runtime before use
 */
function validateEncryptionKey(): void {
  const key = getEncryptionKey()
  if (process.env.NODE_ENV === 'production' && key === DEFAULT_KEY) {
    throw new Error('API_KEY_ENCRYPTION_KEY environment variable must be set in production')
  }
}

/**
 * Encrypt an API key string for storage.
 * Returns base64 encoded: salt(32) + iv(12) + tag(16) + ciphertext
 */
export function encryptApiKey(plaintext: string): string {
  validateEncryptionKey()
  const encryptionKey = getEncryptionKey()
  const salt = crypto.randomBytes(SALT_LENGTH)
  const key = deriveKey(encryptionKey, salt)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  const result = Buffer.concat([salt, iv, tag, encrypted])
  return result.toString('base64')
}

/**
 * Decrypt an encrypted API key string.
 */
export function decryptApiKey(encryptedBase64: string): string {
  validateEncryptionKey()
  const encryptionKey = getEncryptionKey()
  const buffer = Buffer.from(encryptedBase64, 'base64')

  const salt = buffer.subarray(0, SALT_LENGTH)
  const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
  const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)

  const key = deriveKey(encryptionKey, salt)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

/**
 * Mask an API key for display - show only last 4 characters.
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length <= 4) {
    return '••••'
  }
  return '••••••••' + apiKey.slice(-4)
}
