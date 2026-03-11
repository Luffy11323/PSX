// Signal Engine — Orchestrates all 3 layers in parallel
// Non-blocking: all layers always run, results always stored
// Consensus scoring: 1/3, 2/3, 3/3
import 'server-only'

import { runLayer1, Verdict } from './layer1'
import { runLayer2 } from './layer2'
import { runLayer3 } from './layer3'
import { fetchHistoricalData, StockQuote } from './priceFetcher'
import { createAdminSupabase } from '../supabase/server'
import { sendSignalAlert } from './emailService'

export interface SignalResult {
  symbol: string
  price: number
  timestamp: Date
  layer1: { verdict: Verdict; reason: string; confidence: number; data: any }
  layer2: { verdict: Verdict; reason: string; confidence: number }
  layer3: { verdict: Verdict; reason: string; confidence: number; explanation: string }
  consensusScore: number // 0-3
  consensusType: string // "0/3", "1/3", "2/3", "3/3"
  alertSent: boolean
  buyLineCrossed: boolean
  sellLineCrossed: boolean
  isAlltimeBreakout: boolean
}

function scoreConsensus(v1: Verdict, v2: Verdict, v3: Verdict, direction: 'BUY' | 'SELL'): number {
  return [v1, v2, v3].filter(v => v === direction).length
}

export async function analyzeStock(
  quote: StockQuote,
  buyLine: number | null,
  sellLine: number | null,
  userId: string
): Promise<SignalResult> {
  const supabase = createAdminSupabase()

  // Get price history from DB or fetch fresh
  const { data: historyRows } = await supabase
    .from('price_history')
    .select('close, volume, recorded_at')
    .eq('symbol', quote.symbol)
    .order('recorded_at', { ascending: false })
    .limit(200)

  let closes: number[]
  let volumes: number[]

  if (historyRows && historyRows.length >= 30) {
    closes = historyRows.reverse().map((r: any) => r.close)
    volumes = historyRows.map((r: any) => r.volume || 0)
  } else {
    // Fetch fresh historical data
    const bars = await fetchHistoricalData(quote.symbol, '1y')
    closes = bars.map(b => b.close)
    volumes = bars.map(b => b.volume)

    // Store in DB for future use
    if (bars.length > 0) {
      const historyInsert = bars.slice(-90).map(b => ({
        symbol: quote.symbol,
        price: b.close,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
        recorded_at: new Date(b.time * 1000).toISOString(),
      }))
      await supabase.from('price_history').upsert(historyInsert, {
        onConflict: 'symbol,recorded_at',
        ignoreDuplicates: true,
      })
    }
  }

  // Append current price
  closes.push(quote.price)
  volumes.push(quote.volume)

  // Get all-time high
  const { data: athData } = await supabase
    .from('alltime_highs')
    .select('all_time_high, three_year_high')
    .eq('symbol', quote.symbol)
    .single()

  const allTimeHigh = athData?.all_time_high || null
  const threeYearHigh = athData?.three_year_high || null

  // Run all 3 layers in PARALLEL — non-blocking
  const [layer1Result, layer2Result, layer3Result] = await Promise.all([
    runLayer1(closes, Array(closes.length).fill(quote.high), Array(closes.length).fill(quote.low), volumes, quote.price),
    runLayer2(quote.symbol, quote.price, closes, volumes),
    runLayer3(
      quote.symbol,
      quote.price,
      'NEUTRAL', 'Pending', // Will get layer1/2 results after
      'NEUTRAL', 'Pending',
      null, null,
      closes.length >= 5 ? ((closes[closes.length-1] - closes[closes.length-5]) / closes[closes.length-5] * 100) : 0,
      null, allTimeHigh, buyLine, sellLine
    )
  ])

  // Re-run layer 3 with actual layer 1 and 2 results (parallel was just for speed estimate)
  const layer3Final = await runLayer3(
    quote.symbol,
    quote.price,
    layer1Result.verdict,
    layer1Result.reason,
    layer2Result.verdict,
    layer2Result.reason,
    layer1Result.data.rsi,
    layer1Result.data.macd,
    closes.length >= 5 ? ((closes[closes.length-1] - closes[closes.length-5]) / closes[closes.length-5] * 100) : 0,
    layer1Result.data.volumeRatio,
    allTimeHigh,
    buyLine,
    sellLine
  )

  // Determine dominant direction for consensus
  const buyScore = scoreConsensus(layer1Result.verdict, layer2Result.verdict, layer3Final.verdict, 'BUY')
  const sellScore = scoreConsensus(layer1Result.verdict, layer2Result.verdict, layer3Final.verdict, 'SELL')
  const consensusScore = Math.max(buyScore, sellScore)
  const consensusType = `${consensusScore}/3`

  // Check buy/sell line crossings
  const buyLineCrossed = buyLine !== null && quote.price <= buyLine
  const sellLineCrossed = sellLine !== null && quote.price >= sellLine

  // All-time breakout detection (3yr high broken)
  const isAlltimeBreakout = threeYearHigh !== null && quote.price > threeYearHigh

  // Store current price in history
  await supabase.from('price_history').insert({
    symbol: quote.symbol,
    price: quote.price,
    open: quote.open,
    high: quote.high,
    low: quote.low,
    close: quote.price,
    volume: quote.volume,
  })

  // Store signal log
  const { data: signalLog } = await supabase.from('signal_logs').insert({
    symbol: quote.symbol,
    price: quote.price,
    layer1_verdict: layer1Result.verdict,
    layer1_reason: layer1Result.reason,
    layer1_data: layer1Result.data,
    layer2_verdict: layer2Result.verdict,
    layer2_reason: layer2Result.reason,
    layer2_confidence: layer2Result.confidence,
    layer3_verdict: layer3Final.verdict,
    layer3_reason: layer3Final.explanation,
    consensus_score: consensusScore,
    consensus_type: consensusType,
    buy_line_crossed: buyLineCrossed,
    sell_line_crossed: sellLineCrossed,
    is_alltime_breakout: isAlltimeBreakout,
  }).select().single()

  // Determine if alert should be sent
  const { data: settings } = await supabase
    .from('app_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  let alertSent = false

  if (settings) {
    const shouldAlert = checkAlertConditions(
      consensusScore,
      buyLineCrossed,
      sellLineCrossed,
      isAlltimeBreakout,
      settings
    )

    if (shouldAlert && !isQuietHours(settings)) {
      const alertType = getAlertType(consensusScore, buyLineCrossed, sellLineCrossed, isAlltimeBreakout, buyScore, sellScore)
      await sendSignalAlert({
        to: settings.alert_email || '',
        symbol: quote.symbol,
        price: quote.price,
        alertType,
        consensusType,
        layer1: layer1Result,
        layer2: layer2Result,
        layer3: layer3Final,
        buyLine,
        sellLine,
        isAlltimeBreakout,
        allTimeHigh,
      })

      await supabase.from('alert_notifications').insert({
        symbol: quote.symbol,
        alert_type: alertType,
        price: quote.price,
        message: `${alertType} alert for ${quote.symbol} at PKR ${quote.price}`,
        sent_to: settings.alert_email,
        signal_log_id: signalLog?.id,
      })

      await supabase.from('signal_logs').update({ alert_sent: true }).eq('id', signalLog?.id)
      alertSent = true
    }
  }

  return {
    symbol: quote.symbol,
    price: quote.price,
    timestamp: new Date(),
    layer1: layer1Result,
    layer2: layer2Result,
    layer3: layer3Final,
    consensusScore,
    consensusType,
    alertSent,
    buyLineCrossed,
    sellLineCrossed,
    isAlltimeBreakout,
  }
}

function checkAlertConditions(
  score: number,
  buyLineCrossed: boolean,
  sellLineCrossed: boolean,
  isBreakout: boolean,
  settings: any
): boolean {
  if (buyLineCrossed || sellLineCrossed) return settings.alert_on_line_crossing
  if (isBreakout) return true
  if (score === 1 && settings.alert_on_1_of_3) return true
  if (score === 2 && settings.alert_on_2_of_3) return true
  if (score === 3 && settings.alert_on_3_of_3) return true
  return false
}

function isQuietHours(settings: any): boolean {
  if (!settings.quiet_hours_enabled) return false
  const now = new Date()
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()

  const [startH, startM] = settings.quiet_hours_start.split(':').map(Number)
  const [endH, endM] = settings.quiet_hours_end.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = endH * 60 + endM

  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes
}

function getAlertType(
  score: number,
  buyLineCrossed: boolean,
  sellLineCrossed: boolean,
  isBreakout: boolean,
  buyScore: number,
  sellScore: number
): string {
  if (isBreakout) return 'BREAKOUT'
  if (buyLineCrossed) return 'BUY_LINE'
  if (sellLineCrossed) return 'SELL_LINE'
  if (score === 1) return 'SIGNAL_1_3'
  if (score === 2) return 'SIGNAL_2_3'
  return 'SIGNAL_3_3'
}
