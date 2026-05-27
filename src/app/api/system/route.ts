import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import os from 'os'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'

function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const start = os.cpus().map((c) => c.times)
    setTimeout(() => {
      const end = os.cpus().map((c) => c.times)
      let totalDiff = 0
      let idleDiff = 0
      start.forEach((s, i) => {
        const e = end[i]
        const diff =
          Object.values(e).reduce((a, b) => a + b, 0) -
          Object.values(s).reduce((a, b) => a + b, 0)
        const idle = e.idle - s.idle
        totalDiff += diff
        idleDiff += idle
      })
      if (totalDiff === 0) {
        resolve(0)
        return
      }
      resolve(Math.round(((totalDiff - idleDiff) / totalDiff) * 100))
    }, 100)
  })
}

function getStorageInfo(): { used: string; total: string; percentage: number } {
  try {
    const output = execSync('df -k / 2>/dev/null || df -k .', {
      encoding: 'utf-8',
      timeout: 5000,
    })
    const lines = output.trim().split('\n')
    if (lines.length >= 2) {
      const parts = lines[1]!.split(/\s+/)
      const totalKB = parseInt(parts[1]!, 10)
      const usedKB = parseInt(parts[2]!, 10)
      const percentage = totalKB > 0 ? Math.round((usedKB / totalKB) * 100) : 0

      function formatSize(kb: number): string {
        if (kb >= 1073741824) return (kb / 1073741824).toFixed(1) + ' TB'
        if (kb >= 1048576) return (kb / 1048576).toFixed(1) + ' GB'
        if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB'
        return kb + ' KB'
      }

      return {
        used: formatSize(usedKB),
        total: formatSize(totalKB),
        percentage,
      }
    }
  } catch {
    // Fallback
  }
  return { used: '0 GB', total: '0 GB', percentage: 0 }
}

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const cpuPercentage = await getCpuUsage()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const storage = getStorageInfo()

    // Read package.json version info
    let packageVersion = '0.0.0'
    let dependencies: Record<string, string> = {}
    try {
      const pkgPath = join(process.cwd(), 'package.json')
      const pkgRaw = readFileSync(pkgPath, 'utf-8')
      const pkg = JSON.parse(pkgRaw)
      packageVersion = pkg.version || '0.0.0'
      dependencies = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }
    } catch {
      // ignore
    }

    return NextResponse.json({
      cpu: cpuPercentage,
      memory: {
        used: usedMem,
        total: totalMem,
        percentage: totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0,
      },
      storage,
      uptime: os.uptime(),
      platform: os.platform(),
      nodeVersion: process.version,
      cpuCores: os.cpus().length,
      version: packageVersion,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to get system stats' },
      { status: 500 }
    )
  }
}
