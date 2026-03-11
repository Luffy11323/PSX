'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface SignalLog {
  id: string
  symbol: string
  price: number
  timestamp: string
  consensus_score: number
  consensus_type: string
  layer1_verdict: string
  layer2_verdict: string
  layer3_verdict: string
  alert_sent: boolean
  is_alltime_breakout: boolean
  buy_line_crossed: boolean
  sell_line_crossed: boolean
}

interface AlertNotification {
  id: string
  symbol: string
  alert_type: string
  price: number
  sent_at: string
}

const supabase = createClient()

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

const PERIODS: { label: string; days: number }[] = [
  { label: 'This week', days: 7 },
  { label: 'Last 2 weeks', days: 14 },
  { label: 'This month', days: 30 },
]

const STYLES = `
  * { box-sizing: border-box; }

  .page-root {
    min-height: 100vh;
    background: #f7f6f3;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    color: #1a1917;
  }

  .page-header {
    background: white;
    border-bottom: 1px solid #e8e6e0;
    padding: 0 28px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .header-left { display: flex; align-items: center; gap: 12px; }

  .brand-link {
    font-size: 18px;
    font-weight: 700;
    color: #1a1917;
    text-decoration: none;
    letter-spacing: -0.3px;
  }
  .brand-link:hover { color: #6366f1; }

  .header-divider { width: 1px; height: 18px; background: #e8e6e0; }
  .page-title { font-size: 13px; font-weight: 500; color: #9e9c97; }

  .header-nav { display: flex; align-items: center; gap: 4px; }
  .nav-link {
    text-decoration: none;
    font-size: 12px;
    font-weight: 500;
    color: #9e9c97;
    padding: 6px 12px;
    border-radius: 8px;
    transition: all 0.15s;
  }
  .nav-link:hover { background: #f7f6f3; color: #1a1917; }

  .page-body { max-width: 860px; margin: 0 auto; padding: 28px 20px; }

  .report-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
    flex-wrap: wrap;
    gap: 12px;
  }

  .report-title { font-size: 20px; font-weight: 700; color: #1a1917; letter-spacing: -0.4px; }
  .report-date { font-size: 12px; color: #a09e99; margin-top: 2px; }

  .period-tabs {
    display: flex;
    gap: 4px;
    background: white;
    padding: 4px;
    border-radius: 12px;
    border: 1px solid #e8e6e0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .period-btn {
    background: none;
    border: none;
    padding: 6px 14px;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 500;
    color: #9e9c97;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    white-space: nowrap;
  }
  .period-btn:hover { color: #1a1917; background: #f7f6f3; }
  .period-btn.active { background: #6366f1; color: white; box-shadow: 0 2px 8px rgba(99,102,241,0.2); }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
    margin-bottom: 20px;
  }

  .kpi-card {
    background: white;
    border: 1px solid #e8e6e0;
    border-radius: 12px;
    padding: 12px 8px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }

  .kpi-label { font-size: 9px; font-weight: 600; color: #a09e99; letter-spacing: 0.4px; text-transform: uppercase; margin-bottom: 5px; line-height: 1.3; }
  .kpi-value { font-size: 22px; font-weight: 700; line-height: 1; }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }

  .section-card {
    background: white;
    border: 1px solid #e8e6e0;
    border-radius: 14px;
    padding: 18px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }

  .section-card.full { margin-bottom: 12px; }

  .section-card.breakout-card { border-color: #fde68a; background: #fffdf5; }

  .section-label { font-size: 11px; font-weight: 600; color: #a09e99; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 14px; }

  .bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .bar-row:last-child { margin-bottom: 0; }
  .bar-key { font-size: 12px; font-weight: 500; color: #6b6860; width: 80px; flex-shrink: 0; }
  .bar-track { flex: 1; background: #f0ede6; border-radius: 4px; height: 8px; overflow: hidden; }
  .bar-fill { height: 8px; border-radius: 4px; transition: width 0.5s ease; }
  .bar-count { font-family: 'DM Mono', monospace; font-size: 12px; color: #6b6860; width: 24px; text-align: right; }

  .symbol-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 0;
    border-bottom: 1px solid #f7f6f3;
  }
  .symbol-row:last-child { border-bottom: none; }

  .symbol-name { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600; color: #1a1917; }
  .symbol-bars { display: flex; gap: 3px; margin-left: 8px; }
  .symbol-bar { width: 14px; height: 3px; border-radius: 2px; background: #e8e6e0; }
  .symbol-count { font-size: 12px; color: #9e9c97; }

  .alert-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f7f6f3;
    font-size: 13px;
  }
  .alert-row:last-child { border-bottom: none; }

  .alert-left { display: flex; align-items: center; gap: 8px; }
  .alert-sym { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600; color: #1a1917; }
  .alert-type-pill {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 10px;
    background: #f0f0ff;
    color: #6366f1;
  }
  .alert-type-pill.buy { background: #f0fdf4; color: #16a34a; }
  .alert-type-pill.sell { background: #fef2f2; color: #dc2626; }
  .alert-type-pill.breakout { background: #fffbeb; color: #d97706; }

  .alert-right { display: flex; gap: 16px; color: #9e9c97; font-size: 12px; }

  .breakout-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 0;
    border-bottom: 1px solid #fde68a;
    font-size: 12px;
  }
  .breakout-row:last-child { border-bottom: none; }

  .skeleton {
    background: linear-gradient(90deg, #f0ede6 25%, #e8e6e0 50%, #f0ede6 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 12px;
  }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  .empty-note { text-align: center; color: #a09e99; font-size: 12px; padding: 20px 0; }
`

export default function WeeklyReportPage() {
  const [signals, setSignals] = useState<SignalLog[]>([])
  const [alerts, setAlerts] = useState<AlertNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7)

  useEffect(() => { loadData() }, [period])

  const loadData = async () => {
    setLoading(true)
    try {
      const [sigRes, alertRes] = await Promise.all([
        fetchWithAuth('/api/signals?limit=500'),
        fetchWithAuth('/api/alerts'),
      ])
      const [sigData, alertData] = await Promise.all([sigRes.json(), alertRes.json()])

      const cutoff = new Date(Date.now() - period * 24 * 60 * 60 * 1000)
      const filteredSigs = (sigData.data || []).filter(
        (s: SignalLog) => new Date(s.timestamp) >= cutoff
      )
      const filteredAlerts = (alertData.data || []).filter(
        (a: AlertNotification) => new Date(a.sent_at) >= cutoff
      )

      setSignals(filteredSigs)
      setAlerts(filteredAlerts)
    } catch { } finally { setLoading(false) }
  }

  const totalSignals = signals.length
  const strongSignals = signals.filter(s => s.consensus_score === 3).length
  const alertsSent = signals.filter(s => s.alert_sent).length
  const breakouts = signals.filter(s => s.is_alltime_breakout).length
  const buyLineCrossings = signals.filter(s => s.buy_line_crossed).length
  const sellLineCrossings = signals.filter(s => s.sell_line_crossed).length

  const symbolCounts = signals.reduce((acc, s) => {
    acc[s.symbol] = (acc[s.symbol] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const topSymbols = Object.entries(symbolCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const symbolMaxScore = signals.reduce((acc, s) => {
    acc[s.symbol] = Math.max(acc[s.symbol] || 0, s.consensus_score)
    return acc
  }, {} as Record<string, number>)

  const buySignals = signals.filter(s => s.layer3_verdict === 'BUY').length
  const sellSignals = signals.filter(s => s.layer3_verdict === 'SELL').length
  const holdSignals = signals.filter(s => ['HOLD', 'NEUTRAL'].includes(s.layer3_verdict)).length
  const recentAlerts = alerts.slice(0, 10)

  const dateRange = () => {
    const end = new Date()
    const start = new Date(Date.now() - period * 24 * 60 * 60 * 1000)
    return `${start.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }

  const alertPillClass = (type: string) => {
    if (type === 'BUY_LINE') return 'alert-type-pill buy'
    if (type === 'SELL_LINE') return 'alert-type-pill sell'
    if (type === 'BREAKOUT') return 'alert-type-pill breakout'
    return 'alert-type-pill'
  }

  return (
    <div className="page-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="page-header">
        <div className="header-left">
          <a href="/dashboard" className="brand-link">Sentinel</a>
          <div className="header-divider" />
          <span className="page-title">Performance Report</span>
        </div>
        <nav className="header-nav">
          <a href="/dashboard" className="nav-link">Dashboard</a>
          <a href="/dashboard/alerts" className="nav-link">Alerts</a>
          <a href="/dashboard/breakouts" className="nav-link">Breakouts</a>
          <a href="/dashboard/settings" className="nav-link">Settings</a>
        </nav>
      </header>

      <div className="page-body">
        <div className="report-header">
          <div>
            <div className="report-title">Performance Report</div>
            <div className="report-date">{dateRange()}</div>
          </div>
          <div className="period-tabs">
            {PERIODS.map(p => (
              <button
                key={p.days}
                onClick={() => setPeriod(p.days)}
                className={`period-btn${period === p.days ? ' active' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 120 }} />)}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="kpi-grid">
              {[
                { label: 'Total Signals', value: totalSignals, color: '#1a1917' },
                { label: 'Strong 3/3', value: strongSignals, color: '#16a34a' },
                { label: 'Alerts Sent', value: alertsSent, color: '#6366f1' },
                { label: 'Breakouts', value: breakouts, color: '#d97706' },
                { label: 'Buy Triggers', value: buyLineCrossings, color: '#16a34a' },
                { label: 'Sell Triggers', value: sellLineCrossings, color: '#dc2626' },
              ].map(stat => (
                <div key={stat.label} className="kpi-card">
                  <div className="kpi-label">{stat.label}</div>
                  <div className="kpi-value" style={{ color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            <div className="two-col">
              {/* Verdict distribution */}
              <div className="section-card">
                <div className="section-label">AI Verdict Distribution</div>
                {totalSignals === 0 ? (
                  <div className="empty-note">No signals in this period</div>
                ) : (
                  <>
                    {[
                      { label: 'Buy', value: buySignals, color: '#16a34a' },
                      { label: 'Sell', value: sellSignals, color: '#dc2626' },
                      { label: 'Hold / Neutral', value: holdSignals, color: '#e8e6e0' },
                    ].map(item => (
                      <div key={item.label} className="bar-row">
                        <span className="bar-key">{item.label}</span>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${totalSignals > 0 ? (item.value / totalSignals * 100) : 0}%`,
                              background: item.color,
                            }}
                          />
                        </div>
                        <span className="bar-count">{item.value}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Top symbols */}
              <div className="section-card">
                <div className="section-label">Top Active Symbols</div>
                {topSymbols.length === 0 ? (
                  <div className="empty-note">No data</div>
                ) : (
                  topSymbols.map(([symbol, count]) => {
                    const maxScore = symbolMaxScore[symbol] || 0
                    return (
                      <div key={symbol} className="symbol-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="symbol-name">{symbol}</span>
                          <div className="symbol-bars">
                            {[1,2,3].map(i => (
                              <div
                                key={i}
                                className="symbol-bar"
                                style={{
                                  background: i <= maxScore
                                    ? maxScore === 3 ? '#16a34a' : maxScore === 2 ? '#6366f1' : '#d97706'
                                    : '#e8e6e0'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="symbol-count">{count} signals</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Recent alerts */}
            <div className="section-card full">
              <div className="section-label">Recent Alerts ({recentAlerts.length})</div>
              {recentAlerts.length === 0 ? (
                <div className="empty-note">No alerts in this period</div>
              ) : (
                recentAlerts.map(alert => (
                  <div key={alert.id} className="alert-row">
                    <div className="alert-left">
                      <span className="alert-sym">{alert.symbol}</span>
                      <span className={alertPillClass(alert.alert_type)}>
                        {alert.alert_type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="alert-right">
                      {alert.price && <span>PKR {Number(alert.price).toFixed(2)}</span>}
                      <span>{new Date(alert.sent_at).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Breakout events */}
            {breakouts > 0 && (
              <div className="section-card breakout-card">
                <div className="section-label" style={{ color: '#d97706' }}>🏆 Breakout Events This Period</div>
                {signals.filter(s => s.is_alltime_breakout).slice(0, 10).map(s => (
                  <div key={s.id} className="breakout-row">
                    <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 600, color: '#1a1917' }}>{s.symbol}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', color: '#1a1917' }}>PKR {s.price.toFixed(2)}</span>
                    <span style={{ color: '#a09e99', fontSize: 11 }}>
                      {new Date(s.timestamp).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}