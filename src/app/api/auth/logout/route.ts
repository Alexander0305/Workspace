import { NextResponse } from 'next/server'
import { getCurrentUser, deleteSession, createAuditLog } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request)

    // Get token from header or cookie
    let token: string | null = null
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
    if (!token) {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = Object.fromEntries(
          cookieHeader.split(';').map((c) => {
            const [key, ...v] = c.trim().split('=')
            return [key, v.join('=')]
          })
        )
        token = cookies['nova-session'] || null
      }
    }

    if (token) {
      await deleteSession(token)
    }

    if (user) {
      await createAuditLog(user.id, 'auth.logout', request, 'User logged out')
    }

    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
