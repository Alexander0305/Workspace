import { NextRequest, NextResponse } from 'next/server'

// Map of user-facing symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO: Record<string, { id: string; name: string }> = {
  BTC: { id: 'bitcoin', name: 'Bitcoin' },
  ETH: { id: 'ethereum', name: 'Ethereum' },
  SOL: { id: 'solana', name: 'Solana' },
  ADA: { id: 'cardano', name: 'Cardano' },
  DOT: { id: 'polkadot', name: 'Polkadot' },
  LINK: { id: 'chainlink', name: 'Chainlink' },
  AVAX: { id: 'avalanche-2', name: 'Avalanche' },
  MATIC: { id: 'matic-network', name: 'Polygon' },
}

/**
 * Generate a minimal 7-point sparkline from current price and 24h change percentage.
 * This creates a plausible trend line without random noise.
 */
function generateSparklineFromChange(currentPrice: number, change24h: number): number[] {
  const startPrice = currentPrice / (1 + change24h / 100)
  const points: number[] = []
  for (let i = 0; i < 7; i++) {
    const progress = i / 6
    const price = startPrice + (currentPrice - startPrice) * progress
    points.push(Math.round(price * 100) / 100)
  }
  return points
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbolsParam = searchParams.get('symbols')
    const symbols = symbolsParam
      ? symbolsParam.split(',').map((s) => s.trim().toUpperCase())
      : ['BTC', 'ETH', 'SOL', 'ADA']

    // Filter to only symbols we know about
    const knownSymbols = symbols.filter((s) => SYMBOL_TO_COINGECKO[s])
    const coingeckoIds = knownSymbols.map((s) => SYMBOL_TO_COINGECKO[s]!.id).join(',')

    // ── Attempt 1: CoinGecko free API ─────────────────────────────────────
    try {
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds}&vs_currencies=usd&include_24hr_change=true&include_sparkline=true`
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      })

      if (response.ok) {
        const cgData = await response.json()

        const data = knownSymbols.map((symbol) => {
          const coinInfo = SYMBOL_TO_COINGECKO[symbol]!
          const coinData = cgData[coinInfo.id]

          if (!coinData || !coinData.usd) {
            return null
          }

          const price = coinData.usd
          const change24h = coinData.usd_24h_change ?? 0

          // Use CoinGecko sparkline if available, otherwise generate from change %
          let sparkline: number[]
          if (coinData.usd_sparkline_7d && Array.isArray(coinData.usd_sparkline_7d) && coinData.usd_sparkline_7d.length >= 7) {
            // CoinGecko returns 7-day sparkline with many points; sample 7 evenly
            const fullSparkline = coinData.usd_sparkline_7d as number[]
            const step = Math.floor(fullSparkline.length / 6)
            sparkline = []
            for (let i = 0; i < 7; i++) {
              const idx = Math.min(i * step, fullSparkline.length - 1)
              sparkline.push(Math.round(fullSparkline[idx] * 100) / 100)
            }
          } else {
            sparkline = generateSparklineFromChange(price, change24h)
          }

          return {
            symbol,
            name: coinInfo.name,
            price,
            change24h: Math.round(change24h * 100) / 100,
            sparkline,
          }
        }).filter(Boolean)

        return NextResponse.json({
          data,
          fallback: false,
          source: 'coingecko',
          timestamp: new Date().toISOString(),
        })
      }
    } catch {
      // CoinGecko failed, try fallback
    }

    // ── Attempt 2: z-ai-web-dev-sdk web_search ────────────────────────────
    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default
      const zai = await ZAI.create()
      const coinNames = knownSymbols.map((s) => SYMBOL_TO_COINGECKO[s]!.name).join(' ')
      const result = await zai.functions.invoke('web_search', {
        query: `${coinNames} current price USD today`,
        num: 5,
      })

      if (result && Array.isArray(result)) {
        const data = knownSymbols.map((symbol) => {
          const coinInfo = SYMBOL_TO_COINGECKO[symbol]!
          for (const r of result as Array<{ snippet?: string; title?: string }>) {
            const text = (r.snippet || '') + ' ' + (r.title || '')
            const priceRegex = new RegExp(
              `${coinInfo.name}[^$]*\\$([\\d,]+(?:\\.\\d+)?)`,
              'i'
            )
            const match = text.match(priceRegex)
            if (match) {
              const parsedPrice = parseFloat(match[1]!.replace(/,/g, ''))
              if (parsedPrice > 0 && parsedPrice < 1e9) {
                return {
                  symbol,
                  name: coinInfo.name,
                  price: parsedPrice,
                  change24h: 0, // Cannot reliably extract from search snippets
                  sparkline: generateSparklineFromChange(parsedPrice, 0),
                }
              }
            }
          }
          return null
        }).filter(Boolean)

        if (data.length > 0) {
          return NextResponse.json({
            data,
            fallback: true,
            source: 'web_search',
            timestamp: new Date().toISOString(),
          })
        }
      }
    } catch {
      // SDK not available or search failed
    }

    // ── Both sources failed: return error with empty data ──────────────────
    return NextResponse.json(
      {
        error: 'Unable to fetch live cryptocurrency prices. All data sources unavailable.',
        data: [],
        fallback: true,
        source: 'none',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch crypto prices', data: [], timestamp: new Date().toISOString() },
      { status: 500 }
    )
  }
}
