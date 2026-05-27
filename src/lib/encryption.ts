/**
 * Encryption utilities for the NOVA Assistant
 * Uses the Web Crypto API (works in browser and Node.js 18+)
 *
 * Algorithms:
 *   - AES-256-GCM for encryption
 *   - PBKDF2 for key derivation (100,000 iterations)
 *   - SHA-256 for password hashing/verification
 *
 * Encrypted output format (base64): salt(16) + iv(12) + ciphertext
 */

// ---------------------------------------------------------------------------
// Crypto substrate – works in both browser and Node.js 18+
// ---------------------------------------------------------------------------

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle
  }
  // Node.js 18+ exposes crypto.webcrypto, but fall back to dynamic require
  // for environments where globalThis.crypto is not yet set.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto')
  return nodeCrypto.webcrypto.subtle
}

function getCrypto(): Crypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const nodeCrypto = require('crypto')
  return nodeCrypto.webcrypto as Crypto
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PBKDF2_ITERATIONS = 100_000
const SALT_LENGTH = 16 // bytes
const IV_LENGTH = 12 // bytes – recommended for AES-GCM
const KEY_LENGTH = 256 // bits → AES-256

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Concatenate multiple Uint8Arrays into one. */
function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const arr of arrays) {
    result.set(arr, offset)
    offset += arr.length
  }
  return result
}

/** Encode a string to UTF-8 bytes. */
function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

/** Decode UTF-8 bytes back to a string. */
function bytesToText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

/** Convert a Uint8Array to a base64 string. */
function uint8ArrayToBase64(buffer: Uint8Array): string {
  // Use the browser-native btoa when available; otherwise fall back to Buffer.
  if (typeof btoa === 'function') {
    let binary = ''
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]!)
    }
    return btoa(binary)
  }
  return Buffer.from(buffer).toString('base64')
}

/** Convert a base64 string to a Uint8Array. */
function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
  return new Uint8Array(Buffer.from(base64, 'base64'))
}

/** Convert a Uint8Array to a hex string. */
function uint8ArrayToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/** Convert a hex string to a Uint8Array. */
function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string: odd length')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Derive an AES-256-GCM key from a password using PBKDF2.
 *
 * @param password - The user-supplied password.
 * @param salt     - Optional salt (16 bytes). A random one is generated if omitted.
 * @returns The derived CryptoKey and the salt that was used.
 */
export async function generateEncryptionKey(
  password: string,
  salt?: Uint8Array
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const subtle = getSubtleCrypto()
  const crypto = getCrypto()

  const actualSalt = salt ?? crypto.getRandomValues(new Uint8Array(SALT_LENGTH))

  // Import the password as raw key material for PBKDF2
  const keyMaterial = await subtle.importKey(
    'raw',
    textToBytes(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  // Derive the AES-256-GCM key
  const key = await subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: actualSalt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  )

  return { key, salt: actualSalt }
}

/**
 * Encrypt a string with a password.
 *
 * The returned base64 string contains: salt(16) + iv(12) + ciphertext.
 *
 * @param data     - The plaintext string to encrypt.
 * @param password - The encryption password.
 * @returns Base64-encoded encrypted payload.
 */
export async function encryptData(
  data: string,
  password: string
): Promise<string> {
  const subtle = getSubtleCrypto()
  const crypto = getCrypto()

  // Derive key (generates a fresh random salt)
  const { key, salt } = await generateEncryptionKey(password)

  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  // Encrypt
  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    textToBytes(data)
  )

  // Pack: salt + iv + ciphertext
  const packed = concatUint8Arrays(salt, iv, new Uint8Array(ciphertext))

  return uint8ArrayToBase64(packed)
}

/**
 * Decrypt a base64-encoded encrypted payload back to the original string.
 *
 * @param encryptedBase64 - The base64 string produced by `encryptData`.
 * @param password        - The password that was used during encryption.
 * @returns The original plaintext string.
 */
export async function decryptData(
  encryptedBase64: string,
  password: string
): Promise<string> {
  const subtle = getSubtleCrypto()

  const packed = base64ToUint8Array(encryptedBase64)

  // Unpack: salt(16) + iv(12) + ciphertext
  const salt = packed.slice(0, SALT_LENGTH)
  const iv = packed.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const ciphertext = packed.slice(SALT_LENGTH + IV_LENGTH)

  // Re-derive the key using the stored salt
  const { key } = await generateEncryptionKey(password, salt)

  // Decrypt
  const plaintext = await subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return bytesToText(new Uint8Array(plaintext))
}

/**
 * Hash a password using SHA-256 for verification purposes.
 *
 * **Important:** This is NOT a replacement for bcrypt/argon2 for storing
 * user passwords. It is intended for lightweight integrity checks within
 * the NOVA assistant (e.g. verifying a vault master password locally).
 *
 * @param password - The password to hash.
 * @returns Hex-encoded SHA-256 digest.
 */
export async function hashPassword(password: string): Promise<string> {
  const subtle = getSubtleCrypto()

  const digest = await subtle.digest('SHA-256', textToBytes(password))
  return uint8ArrayToHex(new Uint8Array(digest))
}

/**
 * Verify a password against a previously computed SHA-256 hash.
 *
 * @param password - The password to verify.
 * @param hash     - The hex-encoded SHA-256 hash to compare against.
 * @returns `true` if the password matches the hash.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const candidateHash = await hashPassword(password)

  // Constant-time comparison to mitigate timing attacks
  const a = hexToUint8Array(candidateHash)
  const b = hexToUint8Array(hash)

  if (a.length !== b.length) return false

  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a[i]! ^ b[i]!
  }
  return mismatch === 0
}

/**
 * Encrypt binary file content with a password.
 *
 * The returned base64 string contains: salt(16) + iv(12) + ciphertext.
 *
 * @param content  - The raw binary content of the file.
 * @param password - The encryption password.
 * @returns Base64-encoded encrypted payload.
 */
export async function encryptFileContent(
  content: ArrayBuffer,
  password: string
): Promise<string> {
  const subtle = getSubtleCrypto()
  const crypto = getCrypto()

  const { key, salt } = await generateEncryptionKey(password)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    content
  )

  const packed = concatUint8Arrays(salt, iv, new Uint8Array(ciphertext))
  return uint8ArrayToBase64(packed)
}

/**
 * Decrypt a base64-encoded encrypted payload back to binary.
 *
 * @param encryptedBase64 - The base64 string produced by `encryptFileContent`.
 * @param password        - The password that was used during encryption.
 * @returns The original binary content as an ArrayBuffer.
 */
export async function decryptFileContent(
  encryptedBase64: string,
  password: string
): Promise<ArrayBuffer> {
  const subtle = getSubtleCrypto()

  const packed = base64ToUint8Array(encryptedBase64)

  const salt = packed.slice(0, SALT_LENGTH)
  const iv = packed.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const ciphertext = packed.slice(SALT_LENGTH + IV_LENGTH)

  const { key } = await generateEncryptionKey(password, salt)

  const plaintext = await subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return plaintext
}
