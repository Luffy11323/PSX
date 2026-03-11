// PSX Stock Price Fetcher
// Primary: Yahoo Finance (supports PSX via .KA suffix e.g. LUCK.KA)
// Fallback: PSX official data

export interface StockQuote {
  symbol: string
  psxSymbol: string
  price: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  change: number
  changePercent: number
  timestamp: Date
}

export interface HistoricalBar {
  time: number // Unix timestamp
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// PSX symbols use .KA suffix on Yahoo Finance
function toYahooSymbol(psxSymbol: string): string {
  if (psxSymbol.includes('.')) return psxSymbol
  return `${psxSymbol.toUpperCase()}.KA`
}

export async function fetchLivePrice(symbol: string): Promise<StockQuote | null> {
  const yahooSymbol = toYahooSymbol(symbol)

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 0 }
    })

    if (!response.ok) throw new Error(`Yahoo Finance error: ${response.status}`)

    const data = await response.json()
    const result = data?.chart?.result?.[0]

    if (!result) throw new Error('No data returned')

    const meta = result.meta
    const quotes = result.indicators?.quote?.[0]
    const timestamps = result.timestamp || []

    const lastIdx = timestamps.length - 1
    const price = meta.regularMarketPrice || quotes?.close?.[lastIdx] || 0

    return {
      symbol: symbol.toUpperCase(),
      psxSymbol: yahooSymbol,
      price,
      open: meta.regularMarketOpen || quotes?.open?.[0] || price,
      high: meta.regularMarketDayHigh || Math.max(...(quotes?.high?.filter(Boolean) || [price])),
      low: meta.regularMarketDayLow || Math.min(...(quotes?.low?.filter(Boolean) || [price])),
      close: meta.previousClose || price,
      volume: meta.regularMarketVolume || quotes?.volume?.[lastIdx] || 0,
      change: meta.regularMarketChange || 0,
      changePercent: meta.regularMarketChangePercent || 0,
      timestamp: new Date(),
    }
  } catch (error) {
    console.error(`[PriceFetcher] Error fetching ${symbol}:`, error)
    return null
  }
}

export async function fetchMultiplePrices(symbols: string[]): Promise<StockQuote[]> {
  const results = await Promise.allSettled(
    symbols.map(s => fetchLivePrice(s))
  )

  return results
    .filter((r): r is PromiseFulfilledResult<StockQuote> =>
      r.status === 'fulfilled' && r.value !== null
    )
    .map(r => r.value)
}

export async function fetchHistoricalData(
  symbol: string,
  period: '1y' | '2y' | '3y' | '5y' = '3y'
): Promise<HistoricalBar[]> {
  const yahooSymbol = toYahooSymbol(symbol)

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=${period}`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 3600 } // Cache 1 hour
    })

    const data = await response.json()
    const result = data?.chart?.result?.[0]

    if (!result) return []

    const timestamps: number[] = result.timestamp || []
    const quotes = result.indicators?.quote?.[0] || {}

    return timestamps
      .map((t: number, i: number) => ({
        time: t,
        open: quotes.open?.[i] || 0,
        high: quotes.high?.[i] || 0,
        low: quotes.low?.[i] || 0,
        close: quotes.close?.[i] || 0,
        volume: quotes.volume?.[i] || 0,
      }))
      .filter(bar => bar.close > 0)
  } catch (error) {
    console.error(`[PriceFetcher] Historical data error for ${symbol}:`, error)
    return []
  }
}

export async function fetchAllTimeHigh(symbol: string): Promise<{
  allTimeHigh: number
  allTimeHighDate: string
  threeYearHigh: number
} | null> {
  const bars = await fetchHistoricalData(symbol, '5y')
  if (!bars.length) return null

  const threeYearsAgo = Date.now() / 1000 - 3 * 365 * 24 * 3600
  const threeYearBars = bars.filter(b => b.time >= threeYearsAgo)

  let maxBar = bars[0]
  bars.forEach(b => { if (b.high > maxBar.high) maxBar = b })

  const threeYearHigh = Math.max(...threeYearBars.map(b => b.high))

  return {
    allTimeHigh: maxBar.high,
    allTimeHighDate: new Date(maxBar.time * 1000).toISOString().split('T')[0],
    threeYearHigh,
  }
}
