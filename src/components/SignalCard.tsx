'use client'

interface SignalLog {
  id: string
  symbol: string
  price: number
  timestamp: string
  layer1_verdict: string
  layer1_reason: string
  layer1_data: any
  layer2_verdict: string
  layer2_reason: string
  layer2_confidence: number
  layer3_verdict: string
  layer3_reason: string
  consensus_score: number
  consensus_type: string
  alert_sent: boolean
  buy_line_crossed: boolean
  sell_line_crossed: boolean
  is_alltime_breakout: boolean
}

interface SignalCardProps {
  signal: SignalLog
  compact?: boolean
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const classes: Record<string, string> = {
    BUY: 'verdict-buy',
    SELL: 'verdict-sell',
    HOLD: 'verdict-hold',
    NEUTRAL: 'verdict-neutral',
    ERROR: 'verdict-error',
  }
  const icons: Record<string, string> = {
    BUY: '▲', SELL: '▼', HOLD: '◆', NEUTRAL: '○', ERROR: '✕'
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold tracking-widest ${classes[verdict] || 'verdict-neutral'}`}>
      <span>{icons[verdict] || '○'}</span>
      <span>{verdict}</span>
    </span>
  )
}

function LayerRow({
  num,
  label,
  verdict,
  reason,
  confidence,
  extra
}: {
  num: number
  label: string
  verdict: string
  reason: string
  confidence?: number
  extra?: React.ReactNode
}) {
  const borderColors: Record<string, string> = {
    BUY: 'border-sentinel-green',
    SELL: 'border-sentinel-red',
    HOLD: 'border-sentinel-yellow',
    NEUTRAL: 'border-sentinel-muted',
    ERROR: 'border-red-700',
  }

  return (
    <div className={`flex gap-3 p-3 bg-sentinel-bg rounded border-l-2 ${borderColors[verdict] || 'border-sentinel-muted'}`}>
      <div className="shrink-0 w-16">
        <div className="text-xs text-sentinel-subtext tracking-widest">L{num}</div>
        <VerdictBadge verdict={verdict} />
        <div className="text-xs text-sentinel-muted mt-1">{label}</div>
        {confidence !== undefined && (
          <div className="text-xs text-sentinel-subtext mt-1">{confidence}%</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-sentinel-subtext leading-relaxed break-words">{reason}</p>
        {extra}
      </div>
    </div>
  )
}

function ConsensusBar({ score }: { score: number }) {
  const colors = ['bg-sentinel-muted', 'bg-sentinel-yellow', 'bg-sentinel-accent', 'bg-sentinel-green']
  const labels = ['0/3 NO SIGNAL', '1/3 WEAK', '2/3 MODERATE', '3/3 STRONG']

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-8 h-1.5 rounded-full transition-all ${
              i <= score ? colors[score] : 'bg-sentinel-border'
            }`}
          />
        ))}
      </div>
      <span className={`text-xs font-bold tracking-widest ${
        score === 3 ? 'text-sentinel-green' :
        score === 2 ? 'text-sentinel-accent' :
        score === 1 ? 'text-sentinel-yellow' : 'text-sentinel-muted'
      }`}>
        {labels[score]}
      </span>
    </div>
  )
}

export default function SignalCard({ signal, compact = false }: SignalCardProps) {
  const time = new Date(signal.timestamp).toLocaleString('en-PK', {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  })

  const rsi = signal.layer1_data?.rsi
  const macd = signal.layer1_data?.macd
  const isFakeout = signal.layer1_data?.isFakeout

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-sentinel-card border border-sentinel-border rounded hover:border-sentinel-accent transition-colors">
        <div className="shrink-0">
          <div className="font-bold text-sm text-sentinel-text">{signal.symbol}</div>
          <div className="text-xs text-sentinel-subtext">PKR {signal.price.toFixed(2)}</div>
        </div>
        <div className="flex gap-1">
          <VerdictBadge verdict={signal.layer1_verdict} />
          <VerdictBadge verdict={signal.layer2_verdict} />
          <VerdictBadge verdict={signal.layer3_verdict} />
        </div>
        <ConsensusBar score={signal.consensus_score} />
        <div className="ml-auto text-xs text-sentinel-muted">{time}</div>
        {signal.alert_sent && (
          <span className="text-xs text-sentinel-accent">🔔</span>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-sentinel-card border rounded-lg overflow-hidden animate-slide-up ${
      signal.consensus_score === 3 ? 'border-sentinel-green glow-green' :
      signal.is_alltime_breakout ? 'border-sentinel-yellow glow-yellow' :
      signal.consensus_score === 2 ? 'border-sentinel-accent' :
      'border-sentinel-border'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-sentinel-border">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-display text-xl text-sentinel-text tracking-widest">{signal.symbol}</span>
            <span className="text-sentinel-text font-bold">PKR {signal.price.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {signal.buy_line_crossed && (
              <span className="px-2 py-0.5 text-xs bg-sentinel-green text-sentinel-bg font-bold rounded tracking-widest">
                ▼ BUY LINE CROSSED
              </span>
            )}
            {signal.sell_line_crossed && (
              <span className="px-2 py-0.5 text-xs bg-sentinel-red text-white font-bold rounded tracking-widest">
                ▲ SELL LINE CROSSED
              </span>
            )}
            {signal.is_alltime_breakout && (
              <span className="px-2 py-0.5 text-xs bg-sentinel-yellow text-sentinel-bg font-bold rounded tracking-widest">
                🏆 ALL-TIME BREAKOUT
              </span>
            )}
            {isFakeout && (
              <span className="px-2 py-0.5 text-xs bg-sentinel-muted text-sentinel-bg font-bold rounded tracking-widest">
                ⚠ FAKE-OUT DETECTED
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <ConsensusBar score={signal.consensus_score} />
          <div className="text-xs text-sentinel-muted mt-1">{time}</div>
          {signal.alert_sent && (
            <div className="text-xs text-sentinel-accent mt-1">🔔 Alert Sent</div>
          )}
        </div>
      </div>

      {/* Indicators row */}
      {(rsi !== null || macd !== null) && (
        <div className="flex gap-4 px-4 py-2 bg-sentinel-bg border-b border-sentinel-border text-xs">
          {rsi !== null && (
            <span className={`${rsi < 30 ? 'text-sentinel-green' : rsi > 70 ? 'text-sentinel-red' : 'text-sentinel-subtext'}`}>
              RSI: {rsi.toFixed(1)}
            </span>
          )}
          {macd !== null && (
            <span className={`${macd > 0 ? 'text-sentinel-green' : 'text-sentinel-red'}`}>
              MACD: {macd.toFixed(4)}
            </span>
          )}
          {signal.layer1_data?.volumeRatio !== null && (
            <span className="text-sentinel-subtext">
              VOL: {((signal.layer1_data?.volumeRatio || 0) * 100).toFixed(0)}% avg
            </span>
          )}
        </div>
      )}

      {/* 3 Layers */}
      <div className="p-4 space-y-2">
        <LayerRow
          num={1}
          label="RSI/MACD"
          verdict={signal.layer1_verdict}
          reason={signal.layer1_reason}
          confidence={undefined}
        />
        <LayerRow
          num={2}
          label="ML Pattern"
          verdict={signal.layer2_verdict}
          reason={signal.layer2_reason}
          confidence={signal.layer2_confidence}
        />
        <LayerRow
          num={3}
          label="LLM (Groq)"
          verdict={signal.layer3_verdict}
          reason={signal.layer3_reason}
        />
      </div>
    </div>
  )
}
