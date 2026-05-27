import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, checkTierLimit, recordUsage } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check tier limit
    const canGenerate = await checkTierLimit(user.id, 'image_gen')
    if (!canGenerate) {
      return NextResponse.json(
        { error: 'Daily image generation limit reached. Upgrade your tier for more.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { prompt, size = '1024x1024' } = body

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const validSizes = ['1024x1024', '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440']
    const selectedSize = validSizes.includes(size) ? size : '1024x1024'

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const ai = await ZAI.create()

    const response = await ai.images.generations.create({
      prompt: prompt.trim(),
      size: selectedSize as '1024x1024' | '768x1344' | '864x1152' | '1344x768' | '1152x864' | '1440x720' | '720x1440',
    })

    const imageBase64 = response.data?.[0]?.base64 || null

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'No image was generated' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      image: imageBase64,
      prompt: prompt.trim(),
      size: selectedSize,
      created: response.created || Date.now(),
    })
  } catch (error) {
    console.error('Image generation error:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate image'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
