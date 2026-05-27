import { NextResponse } from 'next/server'
import { seedTierLimits } from '@/lib/tier-seed'

export async function POST() {
  try {
    await seedTierLimits()
    return NextResponse.json({ message: 'Tier limits seeded successfully' })
  } catch (error) {
    console.error('Seed tier limits error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
