// Layer 3: LLM Reasoning via Groq (Mistral/LLaMA)
// Provides human-readable explanation and final reasoning
// Uses structured JSON output for reliable parsing

import { Verdict } from './layer1'

export interface Layer3Result {
  verdict: Verdict
  reason: string
  confidence: number
  explanation: string // Full human-readable explanation
  modelUsed: string
}

interface GroqResponse {
  verdict: Verdict
  confidence: number
  short_reason: string
  explanation: string
}

export async function runLayer3(
  symbol: string,
  currentPrice: number,
  layer1Verdict: Verdict,
  layer1Reason: string,
  layer2Verdict: Verdict,
  layer2Reason: string,
  rsi: number | null,
  macd: number | null,
  priceChange5d: number,
  volumeRatio: number | null,
  allTimeHigh: number | null,
  buyLine: number | null,
  sellLine: number | null,
): Promise<Layer3Result> {
  const groqKey = process.env.GROQ_API_KEY

  if (!groqKey) {
    return fallbackReasoning(layer1Verdict, layer2Verdict, layer1Reason, layer2Reason)
  }

  try {
    const Groq = (await import('groq-sdk')).default
    const groq = new Groq({ apiKey: groqKey })

    const systemPrompt = `You are a professional stock market analyst for the Pakistan Stock Exchange (PSX). 
Analyze the provided technical data and give a clear BUY, SELL, HOLD, or NEUTRAL recommendation.
You must respond ONLY with valid JSON matching this exact structure:
{
  "verdict": "BUY" | "SELL" | "HOLD" | "NEUTRAL",
  "confidence": <number 0-100>,
  "short_reason": "<one sentence under 20 words>",
  "explanation": "<detailed explanation 2-3 sentences, mentioning specific numbers>"
}
Do not include any text outside the JSON.`

    const userPrompt = `Analyze ${symbol} stock on PSX:

Current Price: PKR ${currentPrice.toFixed(2)}
5-Day Price Change: ${priceChange5d > 0 ? '+' : ''}${priceChange5d.toFixed(2)}%
Volume vs Average: ${volumeRatio ? `${(volumeRatio * 100).toFixed(0)}% of average` : 'Unknown'}
RSI (14): ${rsi ? rsi.toFixed(1) : 'N/A'}
MACD: ${macd ? macd.toFixed(4) : 'N/A'}
All-Time High: ${allTimeHigh ? `PKR ${allTimeHigh.toFixed(2)}` : 'Unknown'}
User Buy Line: ${buyLine ? `PKR ${buyLine.toFixed(2)}` : 'Not set'}
User Sell Line: ${sellLine ? `PKR ${sellLine.toFixed(2)}` : 'Not set'}

Layer 1 (Technical): ${layer1Verdict} — ${layer1Reason}
Layer 2 (Pattern ML): ${layer2Verdict} — ${layer2Reason}

Provide your independent analysis considering PSX market conditions.`

    const completion = await groq.chat.completions.create({
      model: 'mixtral-8x7b-32768',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 400,
    })

    const content = completion.choices[0]?.message?.content || ''

    // Parse JSON response
    const parsed: GroqResponse = JSON.parse(content.trim())

    // Validate verdict
    const validVerdicts: Verdict[] = ['BUY', 'SELL', 'HOLD', 'NEUTRAL']
    if (!validVerdicts.includes(parsed.verdict)) {
      throw new Error(`Invalid verdict: ${parsed.verdict}`)
    }

    return {
      verdict: parsed.verdict,
      reason: parsed.short_reason,
      confidence: Math.max(0, Math.min(100, parsed.confidence)),
      explanation: parsed.explanation,
      modelUsed: 'mixtral-8x7b-32768 (Groq)',
    }
  } catch (error) {
    console.error('[Layer3] Groq error:', error)
    return fallbackReasoning(layer1Verdict, layer2Verdict, layer1Reason, layer2Reason)
  }
}

function fallbackReasoning(
  l1Verdict: Verdict,
  l2Verdict: Verdict,
  l1Reason: string,
  l2Reason: string
): Layer3Result {
  // Simple majority with fallback reasoning
  const buyCount = [l1Verdict, l2Verdict].filter(v => v === 'BUY').length
  const sellCount = [l1Verdict, l2Verdict].filter(v => v === 'SELL').length

  let verdict: Verdict = 'NEUTRAL'
  if (buyCount >= 2) verdict = 'BUY'
  else if (sellCount >= 2) verdict = 'SELL'
  else if (buyCount > sellCount) verdict = 'BUY'
  else if (sellCount > buyCount) verdict = 'SELL'

  return {
    verdict,
    reason: 'LLM unavailable — based on prior layers consensus',
    confidence: 50,
    explanation: `Layer 1: ${l1Reason}. Layer 2: ${l2Reason}. LLM layer unavailable.`,
    modelUsed: 'fallback-consensus',
  }
}
