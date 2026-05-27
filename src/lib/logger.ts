/**
 * Logging Utility
 * Structured logging for production debugging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

const LOG_COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
}

const RESET = '\x1b[0m'

function formatLog(entry: LogEntry): string {
  const color = LOG_COLORS[entry.level]
  const prefix = `${color}[${entry.level.toUpperCase()}]${RESET}`
  const time = entry.timestamp
  let msg = `${prefix} ${time} - ${entry.message}`
  
  if (entry.context && Object.keys(entry.context).length > 0) {
    msg += ` ${JSON.stringify(entry.context)}`
  }
  
  if (entry.error) {
    msg += `\n  Error: ${entry.error.name}: ${entry.error.message}`
    if (entry.error.stack) {
      msg += `\n  ${entry.error.stack.split('\n').slice(1, 4).join('\n  ')}`
    }
  }
  
  return msg
}

class Logger {
  private minLevel: LogLevel = 'info'
  
  constructor() {
    const envLevel = process.env.LOG_LEVEL as LogLevel | undefined
    if (envLevel && ['debug', 'info', 'warn', 'error'].includes(envLevel)) {
      this.minLevel = envLevel
    }
    // In development, show debug logs
    if (process.env.NODE_ENV === 'development') {
      this.minLevel = 'debug'
    }
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.minLevel)
  }
  
  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    if (!this.shouldLog(level)) return
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    }
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }
    
    // Output formatted log
    if (level === 'error') {
      console.error(formatLog(entry))
    } else if (level === 'warn') {
      console.warn(formatLog(entry))
    } else {
      console.log(formatLog(entry))
    }
  }
  
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('debug', message, context)
  }
  
  info(message: string, context?: Record<string, unknown>): void {
    this.log('info', message, context)
  }
  
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('warn', message, context)
  }
  
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('error', message, context, error)
  }
  
  // Request logging helper
  request(method: string, path: string, statusCode: number, durationMs: number, userId?: string): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    this.log(level, `${method} ${path} ${statusCode} ${durationMs}ms`, { userId })
  }
}

export const logger = new Logger()

// Performance timing utility
export function measureTime<T>(fn: () => T, label: string): T {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start
  logger.debug(`${label} completed`, { durationMs: duration.toFixed(2) })
  return result
}

// Async performance timing utility
export async function measureTimeAsync<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  logger.debug(`${label} completed`, { durationMs: duration.toFixed(2) })
  return result
}
