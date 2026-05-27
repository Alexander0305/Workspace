import { NextResponse } from 'next/server'
import { z } from 'zod/v4'
import { db } from '@/lib/db'
import { getCurrentUser, verifyPassword, hashPassword, createAuditLog } from '@/lib/auth'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be at most 128 characters'),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const result = changePasswordSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.issues },
        { status: 400 }
      )
    }

    const { currentPassword, newPassword } = result.data

    // Verify current password
    const isValid = verifyPassword(currentPassword, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Hash new password
    const newPasswordHash = hashPassword(newPassword)

    // Update password
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    })

    // Audit log
    await createAuditLog(user.id, 'auth.password_change', request, 'Password changed successfully')

    return NextResponse.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
