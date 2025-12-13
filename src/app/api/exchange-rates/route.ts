import { NextResponse } from 'next/server'

// A simple in-memory cache
const cache = {
  rates: null as any,
  lastFetched: 0,
}

const CACHE_DURATION = 4 * 60 * 60 * 1000 // 4 hours

export async function GET() {
  const now = Date.now()

  if (cache.rates && now - cache.lastFetched < CACHE_DURATION) {
    return NextResponse.json({ success: true, data: cache.rates, source: 'cache' })
  }

  try {
    // We'll use USD as the base currency for fetching rates
    const response = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json')
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates: ${response.statusText}`)
    }
    const data = await response.json()

    // Update cache
    cache.rates = data.usd
    cache.lastFetched = now

    return NextResponse.json({ success: true, data: data.usd, source: 'api' })
  } catch (error: any) {
    console.error('Error fetching exchange rates:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
