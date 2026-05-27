import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { readFile, readdir, stat, writeFile, mkdir, unlink } from 'fs/promises'
import { join, relative, extname } from 'path'
import { existsSync } from 'fs'

const PROJECT_ROOT = process.cwd()
const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md', '.html', '.prisma',
  '.yml', '.yaml', '.toml', '.env', '.gitignore', '.txt', '.sh', '.mjs',
  '.cjs', '.mts', '.cts',
])

const ALLOWED_DIRECTORIES = new Set([
  '/src', '/prisma', '/public', '/db',
])

function isPathAllowed(requestPath: string): boolean {
  const normalized = requestPath.replace(/\\/g, '/')
  // Must not contain ..
  if (normalized.includes('..')) return false
  // Must start with allowed directory
  return Array.from(ALLOWED_DIRECTORIES).some(dir => normalized.startsWith(dir))
}

function isFileEditable(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
}

// GET - List files or read file content
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path') || '/src'
    const file = searchParams.get('file')

    // Read specific file content
    if (file) {
      if (!isPathAllowed(file)) {
        return NextResponse.json({ error: 'Access denied: path not allowed' }, { status: 403 })
      }

      const fullPath = join(PROJECT_ROOT, file)
      if (!existsSync(fullPath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }

      const fileStat = await stat(fullPath)
      if (!fileStat.isFile()) {
        return NextResponse.json({ error: 'Not a file' }, { status: 400 })
      }

      // Limit file size to 2MB
      if (fileStat.size > 2 * 1024 * 1024) {
        return NextResponse.json({ error: 'File too large to display' }, { status: 400 })
      }

      try {
        const content = await readFile(fullPath, 'utf-8')
        return NextResponse.json({
          content,
          path: file,
          size: fileStat.size,
          modified: fileStat.mtime.toISOString(),
          editable: isFileEditable(file),
        })
      } catch {
        return NextResponse.json({ error: 'Cannot read file (possibly binary)' }, { status: 400 })
      }
    }

    // List directory contents
    if (!isPathAllowed(path)) {
      return NextResponse.json({ error: 'Access denied: path not allowed' }, { status: 403 })
    }

    const fullPath = join(PROJECT_ROOT, path)
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 })
    }

    const dirStat = await stat(fullPath)
    if (!dirStat.isDirectory()) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 })
    }

    const entries = await readdir(fullPath, { withFileTypes: true })
    const files = entries
      .filter(entry => {
        // Skip hidden files/dirs except specific ones
        if (entry.name.startsWith('.') && entry.name !== '.env' && entry.name !== '.gitignore') return false
        // Skip node_modules, .next, etc
        if (['node_modules', '.next', '.prisma', 'mini-services'].includes(entry.name)) return false
        return true
      })
      .map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'dir' : 'file',
      }))
      .sort((a, b) => {
        // Directories first, then files, alphabetical within each group
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

    return NextResponse.json({ path, files })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to access files'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// PUT - Update file content
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    const body = await request.json()
    const { path: filePath, content } = body

    if (!filePath || content === undefined) {
      return NextResponse.json({ error: 'path and content are required' }, { status: 400 })
    }

    if (!isPathAllowed(filePath)) {
      return NextResponse.json({ error: 'Access denied: path not allowed' }, { status: 403 })
    }

    if (!isFileEditable(filePath)) {
      return NextResponse.json({ error: 'This file type is not editable' }, { status: 403 })
    }

    const fullPath = join(PROJECT_ROOT, filePath)

    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    await writeFile(fullPath, content, 'utf-8')

    return NextResponse.json({ success: true, path: filePath })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update file'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// POST - Create new file
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const body = await request.json()
    const { path: filePath, content = '', type = 'file' } = body

    if (!filePath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    if (!isPathAllowed(filePath)) {
      return NextResponse.json({ error: 'Access denied: path not allowed' }, { status: 403 })
    }

    const fullPath = join(PROJECT_ROOT, filePath)

    if (existsSync(fullPath)) {
      return NextResponse.json({ error: 'File or directory already exists' }, { status: 409 })
    }

    if (type === 'dir') {
      await mkdir(fullPath, { recursive: true })
    } else {
      // Ensure parent directory exists
      const parentDir = join(fullPath, '..')
      if (!existsSync(parentDir)) {
        await mkdir(parentDir, { recursive: true })
      }
      await writeFile(fullPath, content, 'utf-8')
    }

    return NextResponse.json({ success: true, path: filePath }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create file'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE - Delete file
export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    if (!isPathAllowed(filePath)) {
      return NextResponse.json({ error: 'Access denied: path not allowed' }, { status: 403 })
    }

    const fullPath = join(PROJECT_ROOT, filePath)

    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Only allow deleting files, not directories (safety measure)
    const fileStat = await stat(fullPath)
    if (fileStat.isDirectory()) {
      return NextResponse.json({ error: 'Cannot delete directories for safety' }, { status: 403 })
    }

    await unlink(fullPath)

    return NextResponse.json({ success: true, path: filePath })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete file'
    const status = message.includes('Admin') || message.includes('Authentication') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
