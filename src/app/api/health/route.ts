import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: { status: 'ok' | 'error'; latencyMs?: number; error?: string }
    memory: { status: 'ok' | 'warning'; usedMB: number; totalMB: number; percentage: number }
  }
}

const startTime = Date.now()

export async function GET() {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: { status: 'ok' },
      memory: { status: 'ok', usedMB: 0, totalMB: 0, percentage: 0 },
    },
  }

  // Check database connection
  try {
    const dbStart = Date.now()
    await db.$queryRaw`SELECT 1`
    health.checks.database.latencyMs = Date.now() - dbStart
  } catch (error) {
    health.status = 'unhealthy'
    health.checks.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Database connection failed',
    }
  }

  // Check memory usage
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const mem = process.memoryUsage()
    const usedMB = Math.round(mem.heapUsed / 1024 / 1024)
    const totalMB = Math.round(mem.heapTotal / 1024 / 1024)
    const percentage = Math.round((usedMB / totalMB) * 100)
    
    health.checks.memory = {
      status: percentage > 90 ? 'warning' : 'ok',
      usedMB,
      totalMB,
      percentage,
    }
    
    if (percentage > 90) {
      health.status = health.status === 'unhealthy' ? 'unhealthy' : 'degraded'
    }
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
