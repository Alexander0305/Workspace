import { NextRequest, NextResponse } from 'next/server'
import vm from 'vm'
import { executeSchema } from '@/lib/validation'
import { getCurrentUser, checkTierLimit } from '@/lib/auth'

// Dangerous patterns that must never appear in user code
const BLOCKED_PATTERNS = [
  /constructor\s*\.\s*constructor/gi,
  /__proto__/gi,
  /globalThis/gi,
  /\bprocess\b/gi,
  /\brequire\s*\(/gi,
  /\bimport\s+/gi,
  /\beval\s*\(/gi,
  /\bFunction\s*\(/gi,
  /\bReflect\b/gi,
  /\bProxy\b/gi,
]

function containsDangerousCode(code: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    pattern.lastIndex = 0
    if (pattern.test(code)) {
      return `Code contains forbidden pattern: ${pattern.source}`
    }
  }
  return null
}

function transpileTS(code: string): string {
  return code
    .replace(/:\s*(string|number|boolean|any|void|never|unknown|null|undefined)(\[\])?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/interface\s+\w+\s*\{[^}]*\}/g, '')
    .replace(/type\s+\w+\s*=\s*[^;]+;/g, '')
    .replace(/as\s+\w+/g, '')
    .replace(/:\s*\{[^}]*\}/g, '')
}

/**
 * Recursively freeze an object to prevent mutation from sandbox code.
 */
function deepFreeze<T extends Record<string, unknown>>(obj: T): T {
  Object.freeze(obj)
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val as Record<string, unknown>)
    }
  }
  return obj
}

const EXECUTION_TIMEOUT_MS = 5000
const MAX_CODE_SIZE = 10240 // 10KB

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check tier limit
    const canExecute = await checkTierLimit(user.id, 'code_execute')
    if (!canExecute) {
      return NextResponse.json(
        { error: 'Daily code execution limit reached. Upgrade your tier for more.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = executeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { code, language = 'javascript' } = parsed.data
    const lang = language.toLowerCase()

    // Only JavaScript and TypeScript are supported for execution
    if (lang !== 'javascript' && lang !== 'typescript' && lang !== 'js' && lang !== 'ts') {
      return NextResponse.json({
        output: `Code execution is not available for ${language}. Server-side execution is supported for JavaScript and TypeScript only.`,
        error: `Unsupported language: ${language}`,
        executionTime: 0,
      })
    }

    // Size check
    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_SIZE) {
      return NextResponse.json(
        { error: `Code exceeds maximum size of ${MAX_CODE_SIZE} bytes`, output: '', executionTime: 0 },
        { status: 400 }
      )
    }

    // Dangerous code pre-check
    const dangerCheck = containsDangerousCode(code)
    if (dangerCheck) {
      return NextResponse.json(
        { error: `Code rejected for security reasons: ${dangerCheck}`, output: '', executionTime: 0 },
        { status: 400 }
      )
    }

    const output: string[] = []
    const errors: string[] = []

    // Build a frozen sandbox context — no access to Node.js globals
    const sandbox = deepFreeze({
      console: Object.freeze({
        log: (...args: unknown[]) => {
          output.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
        },
        error: (...args: unknown[]) => {
          errors.push(args.map(String).join(' '))
        },
        warn: (...args: unknown[]) => {
          output.push('[WARN] ' + args.map(String).join(' '))
        },
        info: (...args: unknown[]) => {
          output.push('[INFO] ' + args.map(String).join(' '))
        },
      }),
      Math: Object.freeze(Math),
      JSON: Object.freeze(JSON),
      Date: Object.freeze(Date),
      parseInt: Object.freeze(parseInt),
      parseFloat: Object.freeze(parseFloat),
      isNaN: Object.freeze(isNaN),
      isFinite: Object.freeze(isFinite),
      Array: Object.freeze(Array),
      Object: Object.freeze(Object),
      String: Object.freeze(String),
      Number: Object.freeze(Number),
      Boolean: Object.freeze(Boolean),
      Map: Object.freeze(Map),
      Set: Object.freeze(Set),
      RegExp: Object.freeze(RegExp),
      Error: Object.freeze(Error),
      TypeError: Object.freeze(TypeError),
      RangeError: Object.freeze(RangeError),
      SyntaxError: Object.freeze(SyntaxError),
      encodeURIComponent: Object.freeze(encodeURIComponent),
      decodeURIComponent: Object.freeze(decodeURIComponent),
      encodeURI: Object.freeze(encodeURI),
      decodeURI: Object.freeze(decodeURI),
      // Explicitly blocked
      Promise: undefined,
      setTimeout: undefined,
      setInterval: undefined,
      setImmediate: undefined,
      fetch: undefined,
      require: undefined,
      process: undefined,
      global: undefined,
      globalThis: undefined,
      __dirname: undefined,
      __filename: undefined,
      exports: undefined,
      module: undefined,
      constructor: undefined,
      __proto__: undefined,
      prototype: undefined,
    })

    const wrappedCode = lang === 'typescript' || lang === 'ts'
      ? transpileTS(code)
      : code

    const startTime = Date.now()

    try {
      // Use runInNewContext with a completely frozen context
      // and hardened VM options to prevent sandbox escapes
      vm.runInNewContext(wrappedCode, sandbox, {
        timeout: EXECUTION_TIMEOUT_MS,
        microtaskMode: 'afterEvaluate',
        // codeGeneration is a Node.js-specific VM option not yet in TS types
        codeGeneration: {
          strings: false,
          wasm: false,
        },
      } as Parameters<typeof vm.runInNewContext>[2])
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      errors.push(errorMessage)
    }

    const executionTime = Date.now() - startTime

    const combinedOutput = output.join('\n')
    const combinedErrors = errors.join('\n')

    return NextResponse.json({
      output: combinedOutput || (combinedErrors ? '' : '(No output)'),
      error: combinedErrors || undefined,
      executionTime,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to execute code', output: '', executionTime: 0 },
      { status: 500 }
    )
  }
}
