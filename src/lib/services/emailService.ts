// Email Alert Service using Resend
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface AlertPayload {
  to: string
  symbol: string
  price: number
  alertType: string
  consensusType: string
  layer1: any
  layer2: any
  layer3: any
  buyLine: number | null
  sellLine: number | null
  isAlltimeBreakout: boolean
  allTimeHigh: number | null
}

function getAlertColor(alertType: string): string {
  if (alertType.includes('BUY') || alertType === 'SIGNAL_3_3') return '#00ff88'
  if (alertType.includes('SELL')) return '#ff3d5a'
  if (alertType === 'BREAKOUT') return '#ffcc00'
  return '#00d4ff'
}

function getVerdictEmoji(verdict: string): string {
  if (verdict === 'BUY') return '🟢'
  if (verdict === 'SELL') return '🔴'
  if (verdict === 'HOLD') return '🟡'
  return '⚪'
}

function formatAlertTitle(alertType: string, symbol: string): string {
  const titles: Record<string, string> = {
    BUY_LINE: `🟢 BUY ALERT — ${symbol} crossed your Buy Line`,
    SELL_LINE: `🔴 SELL ALERT — ${symbol} crossed your Sell Line`,
    SIGNAL_1_3: `⚪ SIGNAL 1/3 — ${symbol} weak signal detected`,
    SIGNAL_2_3: `🟡 SIGNAL 2/3 — ${symbol} moderate signal`,
    SIGNAL_3_3: `🟢 SIGNAL 3/3 — ${symbol} STRONG CONSENSUS`,
    BREAKOUT: `🏆 BREAKOUT — ${symbol} ALL-TIME HIGH BROKEN`,
    WEEKLY_REPORT: `📊 Weekly Report — PSX Sentinel`,
  }
  return titles[alertType] || `📢 Alert — ${symbol}`
}

export async function sendSignalAlert(payload: AlertPayload): Promise<void> {
  if (!payload.to) return

  const color = getAlertColor(payload.alertType)
  const title = formatAlertTitle(payload.alertType, payload.symbol)
  const timestamp = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:'Courier New',monospace;color:#e2e8f0;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    
    <!-- Header -->
    <div style="border:1px solid ${color};border-radius:8px;padding:20px;margin-bottom:16px;background:#0f1629;">
      <div style="font-size:11px;color:#4a6080;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">PSX SENTINEL ALERT</div>
      <div style="font-size:22px;font-weight:bold;color:${color};">${title}</div>
      <div style="font-size:12px;color:#8899aa;margin-top:8px;">${timestamp} PKT</div>
    </div>

    <!-- Price Box -->
    <div style="background:#141d35;border:1px solid #1e2d4a;border-radius:8px;padding:20px;margin-bottom:16px;text-align:center;">
      <div style="font-size:12px;color:#4a6080;letter-spacing:2px;margin-bottom:8px;">CURRENT PRICE</div>
      <div style="font-size:36px;font-weight:bold;color:#e2e8f0;">PKR ${payload.price.toFixed(2)}</div>
      ${payload.buyLine ? `<div style="font-size:13px;color:#00ff88;margin-top:8px;">Buy Line: PKR ${payload.buyLine.toFixed(2)}</div>` : ''}
      ${payload.sellLine ? `<div style="font-size:13px;color:#ff3d5a;">Sell Line: PKR ${payload.sellLine.toFixed(2)}</div>` : ''}
      ${payload.isAlltimeBreakout ? `<div style="font-size:13px;color:#ffcc00;margin-top:8px;">🏆 ABOVE ALL-TIME HIGH: PKR ${payload.allTimeHigh?.toFixed(2)}</div>` : ''}
    </div>

    <!-- Consensus -->
    <div style="background:#141d35;border:1px solid #1e2d4a;border-radius:8px;padding:20px;margin-bottom:16px;">
      <div style="font-size:11px;color:#4a6080;letter-spacing:2px;margin-bottom:12px;">AI CONSENSUS — ${payload.consensusType} LAYERS AGREE</div>
      
      <!-- Layer 1 -->
      <div style="display:flex;align-items:start;margin-bottom:12px;padding:12px;background:#0f1629;border-radius:6px;border-left:3px solid ${payload.layer1.verdict === 'BUY' ? '#00ff88' : payload.layer1.verdict === 'SELL' ? '#ff3d5a' : '#4a6080'};">
        <div style="min-width:80px;">
          <div style="font-size:10px;color:#4a6080;">LAYER 1</div>
          <div style="font-size:14px;font-weight:bold;color:${payload.layer1.verdict === 'BUY' ? '#00ff88' : payload.layer1.verdict === 'SELL' ? '#ff3d5a' : '#8899aa'};">${getVerdictEmoji(payload.layer1.verdict)} ${payload.layer1.verdict}</div>
          <div style="font-size:10px;color:#4a6080;">RSI/MACD</div>
        </div>
        <div style="flex:1;font-size:12px;color:#8899aa;line-height:1.5;">${payload.layer1.reason}</div>
      </div>

      <!-- Layer 2 -->
      <div style="display:flex;align-items:start;margin-bottom:12px;padding:12px;background:#0f1629;border-radius:6px;border-left:3px solid ${payload.layer2.verdict === 'BUY' ? '#00ff88' : payload.layer2.verdict === 'SELL' ? '#ff3d5a' : '#4a6080'};">
        <div style="min-width:80px;">
          <div style="font-size:10px;color:#4a6080;">LAYER 2</div>
          <div style="font-size:14px;font-weight:bold;color:${payload.layer2.verdict === 'BUY' ? '#00ff88' : payload.layer2.verdict === 'SELL' ? '#ff3d5a' : '#8899aa'};">${getVerdictEmoji(payload.layer2.verdict)} ${payload.layer2.verdict}</div>
          <div style="font-size:10px;color:#4a6080;">ML Pattern</div>
        </div>
        <div style="flex:1;font-size:12px;color:#8899aa;line-height:1.5;">${payload.layer2.reason}</div>
      </div>

      <!-- Layer 3 -->
      <div style="display:flex;align-items:start;padding:12px;background:#0f1629;border-radius:6px;border-left:3px solid ${payload.layer3.verdict === 'BUY' ? '#00ff88' : payload.layer3.verdict === 'SELL' ? '#ff3d5a' : '#4a6080'};">
        <div style="min-width:80px;">
          <div style="font-size:10px;color:#4a6080;">LAYER 3</div>
          <div style="font-size:14px;font-weight:bold;color:${payload.layer3.verdict === 'BUY' ? '#00ff88' : payload.layer3.verdict === 'SELL' ? '#ff3d5a' : '#8899aa'};">${getVerdictEmoji(payload.layer3.verdict)} ${payload.layer3.verdict}</div>
          <div style="font-size:10px;color:#4a6080;">LLM (Groq)</div>
        </div>
        <div style="flex:1;font-size:12px;color:#8899aa;line-height:1.5;">${payload.layer3.explanation}</div>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:11px;color:#4a6080;padding-top:16px;border-top:1px solid #1e2d4a;">
      PSX SENTINEL • This is not financial advice • For informational purposes only
    </div>
  </div>
</body>
</html>`

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'alerts@psxsentinel.com',
      to: payload.to,
      subject: title,
      html,
    })
    console.log(`[Email] Alert sent to ${payload.to} for ${payload.symbol}`)
  } catch (error) {
    console.error('[Email] Failed to send alert:', error)
  }
}

export async function sendWeeklyReport(
  to: string,
  reportData: {
    signals: any[]
    topPerformers: any[]
    breakouts: any[]
    alertsSent: number
    period: string
  }
): Promise<void> {
  if (!to) return

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:'Courier New',monospace;color:#e2e8f0;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="border:1px solid #00d4ff;border-radius:8px;padding:20px;margin-bottom:16px;background:#0f1629;">
      <div style="font-size:11px;color:#4a6080;letter-spacing:3px;margin-bottom:8px;">PSX SENTINEL</div>
      <div style="font-size:22px;color:#00d4ff;font-weight:bold;">📊 Weekly Report</div>
      <div style="font-size:12px;color:#8899aa;margin-top:8px;">${reportData.period}</div>
    </div>
    
    <div style="background:#141d35;border:1px solid #1e2d4a;border-radius:8px;padding:20px;margin-bottom:16px;">
      <div style="font-size:13px;color:#8899aa;">Total Alerts Sent: <span style="color:#00d4ff;">${reportData.alertsSent}</span></div>
      <div style="font-size:13px;color:#8899aa;margin-top:8px;">Total Signals Analyzed: <span style="color:#00d4ff;">${reportData.signals.length}</span></div>
      <div style="font-size:13px;color:#8899aa;margin-top:8px;">Breakouts Detected: <span style="color:#ffcc00;">${reportData.breakouts.length}</span></div>
    </div>

    ${reportData.breakouts.length > 0 ? `
    <div style="background:#141d35;border:1px solid #ffcc00;border-radius:8px;padding:20px;margin-bottom:16px;">
      <div style="font-size:11px;color:#ffcc00;letter-spacing:2px;margin-bottom:12px;">🏆 ALL-TIME BREAKOUTS THIS WEEK</div>
      ${reportData.breakouts.map((b: any) => `
        <div style="padding:8px;background:#0f1629;border-radius:4px;margin-bottom:8px;">
          <span style="color:#ffcc00;font-weight:bold;">${b.symbol}</span>
          <span style="color:#8899aa;margin-left:12px;">PKR ${b.price}</span>
        </div>
      `).join('')}
    </div>` : ''}

    <div style="text-align:center;font-size:11px;color:#4a6080;padding-top:16px;border-top:1px solid #1e2d4a;">
      PSX SENTINEL • Weekly Report • Not financial advice
    </div>
  </div>
</body>
</html>`

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'alerts@psxsentinel.com',
      to,
      subject: `📊 PSX Sentinel Weekly Report — ${reportData.period}`,
      html,
    })
  } catch (error) {
    console.error('[Email] Failed to send weekly report:', error)
  }
}
