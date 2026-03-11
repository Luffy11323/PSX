// Layer 2: HuggingFace ML Model
// Calls a pre-trained financial sentiment/prediction model
// Falls back to a pattern-matching heuristic if HF is unavailable

import { Verdict } from './layer1'

export interface Layer2Result {
  verdict: Verdict
  reason: string
  confidence: number // 0-100
  modelUsed: string
}

// Prepare feature vector from price data
function buildFeaturePrompt(
  symbol: string,
  currentPrice: number,
  priceHistory: number[],
  volumeHistory: number[]
): string {
  const recent = priceHistory.slice(-10)
  const priceChange5d = recent.length >= 5
    ? ((recent[recent.length - 1] - recent[recent.length - 5]) / recent[recent.length - 5] * 100).toFixed(2)
    : '0'
  const priceChange1d = recent.length >= 2
    ? ((recent[recent.length - 1] - recent[recent.length - 2]) / recent[recent.length - 2] * 100).toFixed(2)
    : '0'
  const avgVol = volumeHistory.slice(-5).reduce((a, b) => a + b, 0) / 5
  const curVol = volumeHistory[volumeHistory.length - 1] || 0
  const volRatio = avgVol > 0 ? (curVol / avgVol).toFixed(2) : '1'

  return JSON.stringify({
    symbol,
    current_price: currentPrice,
    price_change_1d_pct: priceChange1d,
    price_change_5d_pct: priceChange5d,
    volume_ratio: volRatio,
    recent_prices: recent.map(p => p.toFixed(2)),
  })
}

export async function runLayer2(
  symbol: string,
  currentPrice: number,
  priceHistory: number[],
  volumeHistory: number[]
): Promise<Layer2Result> {
  const hfToken = process.env.HUGGINGFACE_API_TOKEN

  // Try HuggingFace first
  if (hfToken) {
    try {
      const result = await callHuggingFace(symbol, currentPrice, priceHistory, volumeHistory, hfToken)
      if (result) return result
    } catch (error) {
      console.warn('[Layer2] HuggingFace call failed, using fallback:', error)
    }
  }

  // Fallback: statistical pattern matching
  return patternMatchingFallback(symbol, currentPrice, priceHistory, volumeHistory)
}

async function callHuggingFace(
  symbol: string,
  currentPrice: number,
  priceHistory: number[],
  volumeHistory: number[],
  token: string
): Promise<Layer2Result | null> {
  const featureData = buildFeaturePrompt(symbol, currentPrice, priceHistory, volumeHistory)

  // Use a text classification model for financial sentiment
  const response = await fetch(
    'https://api-inference.huggingface.co/models/ProsusAI/finbert',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: `Stock ${symbol} at PKR ${currentPrice}. Recent price change: ${
          priceHistory.length >= 2
            ? ((priceHistory[priceHistory.length-1] - priceHistory[priceHistory.length-5]) /
               priceHistory[priceHistory.length-5] * 100).toFixed(1)
            : 0
        }% over 5 days. Volume ${
          volumeHistory[volumeHistory.length-1] > volumeHistory[volumeHistory.length-2]
            ? 'increasing'
            : 'decreasing'
        }.`,
      }),
    }
  )

  if (!response.ok) return null

  const data = await response.json()
  if (!Array.isArray(data) || !data[0]) return null

  // FinBERT returns: positive, negative, neutral
  const scores: { label: string; score: number }[] = data[0]
  const sorted = [...scores].sort((a, b) => b.score - a.score)
  const top = sorted[0]

  let verdict: Verdict = 'NEUTRAL'
  if (top.label === 'positive') verdict = 'BUY'
  else if (top.label === 'negative') verdict = 'SELL'
  else verdict = 'NEUTRAL'

  return {
    verdict,
    reason: `FinBERT sentiment: ${top.label} (${(top.score * 100).toFixed(1)}% confidence). Scores: ${
      scores.map(s => `${s.label}: ${(s.score * 100).toFixed(1)}%`).join(', ')
    }`,
    confidence: Math.round(top.score * 100),
    modelUsed: 'ProsusAI/finbert',
  }
}

function patternMatchingFallback(
  symbol: string,
  currentPrice: number,
  priceHistory: number[],
  volumeHistory: number[]
): Layer2Result {
  if (priceHistory.length < 5) {
    return {
      verdict: 'NEUTRAL',
      reason: 'Insufficient data for pattern analysis',
      confidence: 0,
      modelUsed: 'statistical-fallback',
    }
  }

  const recent = priceHistory.slice(-20)
  const older = priceHistory.slice(-40, -20)

  // Support/resistance levels
  const recentHigh = Math.max(...recent)
  const recentLow = Math.min(...recent)
  const midpoint = (recentHigh + recentLow) / 2

  // Price momentum
  const shortMomentum = recent[recent.length - 1] - recent[recent.length - 5]
  const longMomentum = older.length > 0
    ? recent[recent.length - 1] - older[older.length - 1]
    : 0

  // Volume trend
  const recentVol = volumeHistory.slice(-5)
  const olderVol = volumeHistory.slice(-10, -5)
  const volTrend = recentVol.length > 0 && olderVol.length > 0
    ? (recentVol.reduce((a, b) => a + b, 0) / recentVol.length) /
      (olderVol.reduce((a, b) => a + b, 0) / olderVol.length)
    : 1

  // Near support with positive momentum = BUY
  const nearSupport = currentPrice <= recentLow * 1.02
  const nearResistance = currentPrice >= recentHigh * 0.98
  const positiveMomentum = shortMomentum > 0 && longMomentum > 0
  const negativeMomentum = shortMomentum < 0 && longMomentum < 0
  const volumeConfirms = volTrend > 1.1

  let verdict: Verdict = 'NEUTRAL'
  let reason = ''
  let confidence = 40

  if (nearSupport && positiveMomentum && volumeConfirms) {
    verdict = 'BUY'
    reason = `Near support level (${recentLow.toFixed(2)}), positive momentum, volume increasing (${volTrend.toFixed(2)}x avg)`
    confidence = 72
  } else if (nearResistance && negativeMomentum) {
    verdict = 'SELL'
    reason = `Near resistance level (${recentHigh.toFixed(2)}), negative momentum`
    confidence = 68
  } else if (nearSupport) {
    verdict = 'BUY'
    reason = `Near support level (${recentLow.toFixed(2)}), price at PKR ${currentPrice.toFixed(2)}`
    confidence = 55
  } else if (nearResistance) {
    verdict = 'SELL'
    reason = `Near resistance level (${recentHigh.toFixed(2)}), price at PKR ${currentPrice.toFixed(2)}`
    confidence = 55
  } else if (currentPrice > midpoint && positiveMomentum) {
    verdict = 'HOLD'
    reason = `Price above midpoint range, mild upward momentum`
    confidence = 45
  } else {
    verdict = 'NEUTRAL'
    reason = `No clear pattern. Price in mid-range: ${recentLow.toFixed(2)} – ${recentHigh.toFixed(2)}`
    confidence = 30
  }

  return { verdict, reason, confidence, modelUsed: 'statistical-fallback' }
}
