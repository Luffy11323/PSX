// Layer 1: Rule-Based Technical Analysis
// Uses RSI, MACD, and Volume to generate signals
// Acts as the first gate — fast, always runs, zero API cost

import {
  RSI,
  MACD,
  BollingerBands,
  EMA,
} from 'technicalindicators'

export type Verdict = 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL' | 'ERROR'

export interface Layer1Result {
  verdict: Verdict
  reason: string
  confidence: number // 0-100
  data: {
    rsi: number | null
    macd: number | null
    macdSignal: number | null
    macdHistogram: number | null
    ema20: number | null
    ema50: number | null
    bbUpper: number | null
    bbLower: number | null
    volumeRatio: number | null
    isFakeout: boolean
    indicators: string[]
  }
}

export async function runLayer1(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  currentPrice: number
): Promise<Layer1Result> {
  try {
    if (closes.length < 26) {
      return {
        verdict: 'NEUTRAL',
        reason: 'Insufficient data for analysis (need 26+ data points)',
        confidence: 0,
        data: {
          rsi: null, macd: null, macdSignal: null, macdHistogram: null,
          ema20: null, ema50: null, bbUpper: null, bbLower: null,
          volumeRatio: null, isFakeout: false, indicators: []
        }
      }
    }

    // Calculate RSI (14-period)
    const rsiValues = RSI.calculate({ values: closes, period: 14 })
    const rsi = rsiValues[rsiValues.length - 1] ?? null

    // Calculate MACD (12,26,9)
    const macdValues = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    })
    const macdLatest = macdValues[macdValues.length - 1]
    const macdPrev = macdValues[macdValues.length - 2]
    const macd = macdLatest?.MACD ?? null
    const macdSignal = macdLatest?.signal ?? null
    const macdHistogram = macdLatest?.histogram ?? null

    // EMA 20 and 50
    const ema20Values = EMA.calculate({ values: closes, period: 20 })
    const ema50Values = EMA.calculate({ values: closes, period: 50 })
    const ema20 = ema20Values[ema20Values.length - 1] ?? null
    const ema50 = ema50Values[ema50Values.length - 1] ?? null

    // Bollinger Bands (20, 2)
    const bbValues = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 })
    const bbLatest = bbValues[bbValues.length - 1]
    const bbUpper = bbLatest?.upper ?? null
    const bbLower = bbLatest?.lower ?? null

    // Volume ratio (current vs 20-day avg)
    const recentVolumes = volumes.slice(-20)
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length
    const currentVolume = volumes[volumes.length - 1] || 0
    const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : null

    // --- Signal Logic ---
    const buySignals: string[] = []
    const sellSignals: string[] = []

    // RSI signals
    if (rsi !== null) {
      if (rsi < 30) buySignals.push(`RSI oversold (${rsi.toFixed(1)})`)
      else if (rsi < 40) buySignals.push(`RSI approaching oversold (${rsi.toFixed(1)})`)
      else if (rsi > 70) sellSignals.push(`RSI overbought (${rsi.toFixed(1)})`)
      else if (rsi > 60) sellSignals.push(`RSI approaching overbought (${rsi.toFixed(1)})`)
    }

    // MACD crossover signals
    if (macd !== null && macdSignal !== null && macdPrev?.MACD !== undefined && macdPrev?.signal !== undefined) {
      const bullishCross = macdPrev.MACD < macdPrev.signal && macd > macdSignal
      const bearishCross = macdPrev.MACD > macdPrev.signal && macd < macdSignal
      if (bullishCross) buySignals.push('MACD bullish crossover')
      if (bearishCross) sellSignals.push('MACD bearish crossover')
      if (macdHistogram !== null && macdHistogram > 0) buySignals.push('MACD histogram positive')
      if (macdHistogram !== null && macdHistogram < 0) sellSignals.push('MACD histogram negative')
    }

    // EMA trend signals
    if (ema20 !== null && ema50 !== null) {
      if (ema20 > ema50 && currentPrice > ema20) buySignals.push('Price above EMA20 > EMA50 (uptrend)')
      if (ema20 < ema50 && currentPrice < ema20) sellSignals.push('Price below EMA20 < EMA50 (downtrend)')
    }

    // Bollinger Band signals
    if (bbLower !== null && bbUpper !== null) {
      if (currentPrice <= bbLower) buySignals.push('Price at/below lower Bollinger Band')
      if (currentPrice >= bbUpper) sellSignals.push('Price at/above upper Bollinger Band')
    }

    // Fake-out detection: price moves but volume doesn't confirm
    const isFakeout = (() => {
      if (!volumeRatio) return false
      const priceMove = Math.abs(closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]
      // Price moved >1% but volume is below 70% of average = likely fake-out
      return priceMove > 0.01 && volumeRatio < 0.7
    })()

    if (isFakeout) {
      buySignals.length = 0
      sellSignals.length = 0
    }

    // Determine verdict
    let verdict: Verdict = 'NEUTRAL'
    let reason = ''
    let confidence = 50

    if (isFakeout) {
      verdict = 'NEUTRAL'
      reason = `Fake-out detected — price movement not confirmed by volume (ratio: ${volumeRatio?.toFixed(2)})`
      confidence = 20
    } else if (buySignals.length > sellSignals.length) {
      verdict = 'BUY'
      reason = buySignals.join('; ')
      confidence = Math.min(50 + buySignals.length * 15, 95)
    } else if (sellSignals.length > buySignals.length) {
      verdict = 'SELL'
      reason = sellSignals.join('; ')
      confidence = Math.min(50 + sellSignals.length * 15, 95)
    } else if (buySignals.length > 0) {
      verdict = 'HOLD'
      reason = `Mixed signals — Buy: ${buySignals.join('; ')} | Sell: ${sellSignals.join('; ')}`
      confidence = 40
    } else {
      verdict = 'NEUTRAL'
      reason = 'No strong signals detected'
      confidence = 30
    }

    return {
      verdict,
      reason,
      confidence,
      data: {
        rsi,
        macd,
        macdSignal,
        macdHistogram,
        ema20,
        ema50,
        bbUpper,
        bbLower,
        volumeRatio,
        isFakeout,
        indicators: [...buySignals, ...sellSignals],
      }
    }
  } catch (error) {
    console.error('[Layer1] Error:', error)
    return {
      verdict: 'ERROR',
      reason: `Layer 1 error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      confidence: 0,
      data: {
        rsi: null, macd: null, macdSignal: null, macdHistogram: null,
        ema20: null, ema50: null, bbUpper: null, bbLower: null,
        volumeRatio: null, isFakeout: false, indicators: []
      }
    }
  }
}
