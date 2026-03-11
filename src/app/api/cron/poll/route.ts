// /api/cron/poll — runs every 1 minute via Vercel Cron
// Fetches all active watchlist stocks and runs 3-layer analysis

import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/server'
import { fetchMultiplePrices } from '@/lib/services/priceFetcher'
import { analyzeStock } from '@/lib/services/signalEngine'
import { fetchAllTimeHigh } from '@/lib/services/priceFetcher'

export const maxDuration = 60 // Vercel max for hobby

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabase()
  const startTime = Date.now()

  try {
    // Get all active watchlist items grouped by user
    const { data: watchlistItems, error } = await supabase
      .from('watchlist')
      .select('*, profiles(id, alert_email)')
      .eq('is_active', true)

    if (error) throw error
    if (!watchlistItems?.length) {
      return NextResponse.json({ message: 'No active watchlist items', processed: 0 })
    }

    // Check poll interval per user
    const { data: settings } = await supabase
      .from('app_settings')
      .select('user_id, poll_interval_seconds')

    const settingsMap = new Map(settings?.map((s: any) => [s.user_id, s]) || [])

    // Deduplicate symbols across users
    const uniqueSymbols = [...new Set(watchlistItems.map((w: any) => w.symbol))]

    // Fetch all prices in one batch
    const quotes = await fetchMultiplePrices(uniqueSymbols)
    const quoteMap = new Map(quotes.map(q => [q.symbol, q]))

    // Update all-time highs (once per hour check)
    const { data: athLastUpdate } = await supabase
      .from('alltime_highs')
      .select('symbol, last_updated')
      .in('symbol', uniqueSymbols)

    const athMap = new Map(athLastUpdate?.map((a: any) => [a.symbol, a]) || [])
    const oneHourAgo = Date.now() - 3600000

    for (const symbol of uniqueSymbols) {
      const ath = athMap.get(symbol)
      if (!ath || new Date(ath.last_updated).getTime() < oneHourAgo) {
        const athData = await fetchAllTimeHigh(symbol)
        if (athData) {
          await supabase.from('alltime_highs').upsert({
            symbol,
            all_time_high: athData.allTimeHigh,
            all_time_high_date: athData.allTimeHighDate,
            three_year_high: athData.threeYearHigh,
            last_updated: new Date().toISOString(),
          }, { onConflict: 'symbol' })
        }
      }
    }

    // Process each watchlist item
    const results = []
    for (const item of watchlistItems) {
      const quote = quoteMap.get(item.symbol)
      if (!quote) continue

      // Check poll interval — skip if too soon
      const userSettings = settingsMap.get(item.user_id) as any
      const intervalSeconds = userSettings?.poll_interval_seconds || 60
      const { data: lastSignal } = await supabase
        .from('signal_logs')
        .select('timestamp')
        .eq('symbol', item.symbol)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single()

      if (lastSignal) {
        const lastTime = new Date(lastSignal.timestamp).getTime()
        const elapsed = (Date.now() - lastTime) / 1000
        if (elapsed < intervalSeconds - 5) continue // 5s buffer
      }

      try {
        const result = await analyzeStock(
          quote,
          item.buy_line,
          item.sell_line,
          item.user_id
        )
        results.push({ ...result, symbol: item.symbol });
      } catch (err) {
        console.error(`[Cron] Error analyzing ${item.symbol}:`, err)
        results.push({ symbol: item.symbol, error: String(err) })
      }
    }

    const duration = Date.now() - startTime
    console.log(`[Cron] Processed ${results.length} stocks in ${duration}ms`)

    return NextResponse.json({
      success: true,
      processed: results.length,
      duration_ms: duration,
      results: results.filter((r): r is Exclude<typeof r, { error: string }> => !('error' in r))
        .map(r => ({
          symbol: r.symbol,
          price: r.price,
          consensus: r.consensusType,
          alertSent: r.alertSent,
      }))
    })
  } catch (error) {
    console.error('[Cron] Fatal error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
