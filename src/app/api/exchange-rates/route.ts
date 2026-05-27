import { NextResponse } from 'next/server'

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CNY: 7.24,
  AED: 3.67,
  SAR: 3.75,
  INR: 83.12,
  CAD: 1.36,
  AUD: 1.53,
  CHF: 0.88,
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'AED', 'SAR', 'INR', 'CAD', 'AUD', 'CHF']

// In-memory cache with TTL
let cachedRates: Record<string, number> | null = null
let cachedTimestamp: string | null = null
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

async function fetchFromFreeApi(): Promise<{ rates: Record<string, number>; timestamp: string } | null> {
  try {
    // Use open.er-api.com — free, no API key required
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return null
    const data = await response.json()
    if (data.rates && typeof data.rates === 'object') {
      const rates: Record<string, number> = { USD: 1 }
      for (const currency of CURRENCIES) {
        if (currency !== 'USD' && data.rates[currency] != null) {
          rates[currency] = data.rates[currency]
        }
      }
      return { rates, timestamp: data.time_last_update_utc || new Date().toISOString() }
    }
    return null
  } catch {
    return null
  }
}

async function fetchFromAlternateApi(): Promise<{ rates: Record<string, number>; timestamp: string } | null> {
  try {
    // Fallback: frankfurter.app — free, open source, no key
    const currencies = CURRENCIES.filter(c => c !== 'USD').join(',')
    const response = await fetch(`https://api.frankfurter.app/latest?from=USD&to=${currencies}`, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return null
    const data = await response.json()
    if (data.rates && typeof data.rates === 'object') {
      const rates: Record<string, number> = { USD: 1 }
      for (const currency of CURRENCIES) {
        if (currency !== 'USD' && data.rates[currency] != null) {
          rates[currency] = data.rates[currency]
        }
      }
      return { rates, timestamp: data.date || new Date().toISOString() }
    }
    return null
  } catch {
    return null
  }
}

async function fetchFromWebSearch(): Promise<{ rates: Record<string, number>; timestamp: string } | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const result = await zai.functions.invoke('web_search', {
      query: 'USD to EUR GBP JPY CNY AED SAR INR CAD AUD CHF exchange rate today',
      num: 5,
    })

    if (!result?.results || !Array.isArray(result.results)) return null

    const rates: Record<string, number> = { USD: 1 }
    const text = result.results.map((r: { snippet?: string; title?: string }) => `${r.snippet || ''} ${r.title || ''}`).join(' ')

    for (const currency of CURRENCIES) {
      if (currency === 'USD') continue
      // Try to find patterns like "1 USD = 0.92 EUR" or "EUR: 0.92"
      const patterns = [
        new RegExp(`1\\s*USD\\s*[=:]\\s*([\\d.]+)\\s*${currency}`, 'i'),
        new RegExp(`${currency}\\s*[=:]\\s*([\\d.]+)`, 'i'),
        new RegExp(`${currency}[\\s/]*([\\d.]+)`, 'i'),
      ]
      for (const regex of patterns) {
        const match = text.match(regex)
        if (match) {
          const val = parseFloat(match[1]!)
          if (val > 0 && val < 1e6) {
            rates[currency] = val
            break
          }
        }
      }
    }

    // Only return if we found at least 3 currencies beyond USD
    const foundCount = Object.keys(rates).filter(k => k !== 'USD').length
    if (foundCount >= 3) {
      return { rates, timestamp: new Date().toISOString() }
    }
    return null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    // Check in-memory cache first
    if (cachedRates && cachedTimestamp) {
      const cacheAge = Date.now() - new Date(cachedTimestamp).getTime()
      if (cacheAge < CACHE_TTL) {
        return NextResponse.json({
          rates: cachedRates,
          timestamp: cachedTimestamp,
          source: 'cache',
        })
      }
    }

    // Try APIs in order: primary → alternate → web search → fallback
    let result = await fetchFromFreeApi()
    let source = 'open.er-api.com'

    if (!result) {
      result = await fetchFromAlternateApi()
      source = 'frankfurter.app'
    }

    if (!result) {
      result = await fetchFromWebSearch()
      source = 'web_search'
    }

    if (!result) {
      // Use fallback data
      return NextResponse.json({
        rates: FALLBACK_RATES,
        timestamp: new Date().toISOString(),
        source: 'fallback',
        fallback: true,
      })
    }

    // Cache the result
    cachedRates = result.rates
    cachedTimestamp = result.timestamp

    return NextResponse.json({
      rates: result.rates,
      timestamp: result.timestamp,
      source,
      fallback: false,
    })
  } catch {
    return NextResponse.json(
      { rates: FALLBACK_RATES, timestamp: new Date().toISOString(), source: 'fallback', fallback: true },
      { status: 200 }
    )
  }
}
