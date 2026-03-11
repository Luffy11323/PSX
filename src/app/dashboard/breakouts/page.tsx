'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BreakoutStock {
  symbol: string
  all_time_high: number
  all_time_high_date: string
  three_year_high: number
  last_updated: string
  current_price?: number
  last_breakout_signal?: string
  breakout_count?: number
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

  .hero-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    margin-bottom: 20px;
  }

  .hero-card {
    background: white;
    border: 1px solid #e8e6e0;
    border-radius: 14px;
    padding: 20px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .hero-card.highlight {
    border-color: #fde68a;
    background: #fffdf5;
  }

  .hero-label { font-size: 11px; font-weight: 600; color: #a09e99; letter-spacing: 0.4px; text-transform: uppercase; margin-bottom: 6px; }
  .hero-value { font-size: 36px; font-weight: 700; line-height: 1; }
  .hero-sub { font-size: 11px; color: #a09e99; margin-top: 5px; }

  .info-banner {
    background: white;
    border: 1px solid #e8e6e0;
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 20px;
    font-size: 13px;
    color: #6b6860;
    line-height: 1.6;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }

  .tab-bar {
    display: flex;
    gap: 4px;
    margin-bottom: 20px;
    background: white;
    padding: 4px;
    border-radius: 12px;
    border: 1px solid #e8e6e0;
    width: fit-content;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .tab-btn {
    background: none;
    border: none;
    padding: 7px 16px;
    border-radius: 9px;
    font-size: 12px;
    font-weight: 500;
    color: #9e9c97;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    font-family: inherit;
  }
  .tab-btn:hover { color: #1a1917; background: #f7f6f3; }
  .tab-btn.active { background: #6366f1; color: white; box-shadow: 0 2px 8px rgba(99,102,241,0.2); }

  .stock-list { display: flex; flex-direction: column; gap: 10px; }

  .stock-card {
    background: white;
    border: 1px solid #e8e6e0;
    border-radius: 14px;
    padding: 16px;
    transition: box-shadow 0.15s, transform 0.15s;
  }
  .stock-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.07); transform: translateY(-1px); }
  .stock-card.active-breakout { border-color: #fde68a; border-left: 3px solid #d97706; }

  .stock-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
  .stock-left { display: flex; align-items: center; gap: 10px; }

  .stock-symbol { font-family: 'DM Mono', 'Courier New', monospace; font-size: 16px; font-weight: 600; color: #1a1917; }

  .breakout-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
    background: #fffbeb;
    color: #d97706;
    border: 1px solid #fde68a;
  }

  .stock-date { font-size: 11px; color: #a09e99; margin-top: 2px; }

  .stock-right { text-align: right; }
  .stock-price { font-family: 'DM Mono', monospace; font-size: 16px; font-weight: 600; color: #1a1917; }
  .stock-count { font-size: 11px; color: #6366f1; margin-top: 2px; }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .metric-box {
    background: #fafaf8;
    border: 1px solid #f0ede6;
    border-radius: 10px;
    padding: 10px 12px;
    text-align: center;
  }

  .metric-label { font-size: 10px; font-weight: 600; color: #a09e99; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }
  .metric-value { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600; color: #1a1917; }
  .metric-sub { font-size: 10px; margin-top: 2px; }

  .skeleton {
    background: linear-gradient(90deg, #f0ede6 25%, #e8e6e0 50%, #f0ede6 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 12px;
  }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

  .empty-state { text-align: center; padding: 80px 0; color: #a09e99; }
  .empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
  .empty-title { font-size: 15px; font-weight: 600; color: #6b6860; margin-bottom: 4px; }
  .empty-sub { font-size: 13px; }
`

export default function BreakoutsPage() {
  const [breakouts, setBreakouts] = useState<BreakoutStock[]>([])
  const [activeBreakouts, setActiveBreakouts] = useState<BreakoutStock[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'active' | 'all'>('active')

  useEffect(() => { loadBreakouts() }, [])

  const loadBreakouts = async () => {
    setLoading(true)
    try {
      const [athRes, sigRes] = await Promise.all([
        fetchWithAuth('/api/breakouts'),
        fetchWithAuth('/api/signals?limit=500'),
      ])
      const [athData, sigData] = await Promise.all([athRes.json(), sigRes.json()])

      const allHighs: BreakoutStock[] = athData.data || []
      const signals = sigData.data || []

      const enriched = allHighs.map(stock => {
        const stockSignals = signals.filter((s: any) => s.symbol === stock.symbol && s.is_alltime_breakout)
        const latestSignal = stockSignals[0]
        return {
          ...stock,
          current_price: latestSignal?.price,
          last_breakout_signal: latestSignal?.timestamp,
          breakout_count: stockSignals.length,
        }
      })

      setBreakouts(enriched)

      const active = enriched.filter(s =>
        s.current_price && s.three_year_high && s.current_price > s.three_year_high
      )
      setActiveBreakouts(active)
    } catch { } finally { setLoading(false) }
  }

  const displayList = view === 'active' ? activeBreakouts : breakouts
  const totalBreakoutSignals = breakouts.reduce((sum, s) => sum + (s.breakout_count || 0), 0)

  return (
    <div className="page-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="page-header">
        <div className="header-left">
          <a href="/dashboard" className="brand-link">Sentinel</a>
          <div className="header-divider" />
          <span className="page-title">Breakouts</span>
        </div>
        <nav className="header-nav">
          <a href="/dashboard" className="nav-link">Dashboard</a>
          <a href="/dashboard/alerts" className="nav-link">Alerts</a>
          <a href="/dashboard/settings" className="nav-link">Settings</a>
        </nav>
      </header>

      <div className="page-body">
        {/* Hero stats */}
        <div className="hero-grid">
          <div className="hero-card highlight">
            <div className="hero-label">Active Breakouts</div>
            <div className="hero-value" style={{ color: '#d97706' }}>{activeBreakouts.length}</div>
            <div className="hero-sub">Currently above 3yr high</div>
          </div>
          <div className="hero-card">
            <div className="hero-label">Tracked Stocks</div>
            <div className="hero-value" style={{ color: '#1a1917' }}>{breakouts.length}</div>
            <div className="hero-sub">With ATH data</div>
          </div>
          <div className="hero-card">
            <div className="hero-label">Total Breakout Signals</div>
            <div className="hero-value" style={{ color: '#6366f1' }}>{totalBreakoutSignals}</div>
            <div className="hero-sub">Historical breakout events</div>
          </div>
        </div>

        {/* Info banner */}
        <div className="info-banner">
          <strong style={{ color: '#d97706' }}>🏆 Breakout Detection:</strong> A stock is flagged when its current price exceeds its{' '}
          <strong style={{ color: '#1a1917' }}>3-year high</strong> — a historically strong buy signal indicating the stock has broken through long-term resistance.
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {(['active', 'all'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`tab-btn${view === v ? ' active' : ''}`}
            >
              {v === 'active' ? `🏆 Active (${activeBreakouts.length})` : `📋 All tracked (${breakouts.length})`}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
          </div>
        ) : displayList.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">{view === 'active' ? 'No active breakouts' : 'No stocks tracked yet'}</div>
            <div className="empty-sub">
              {view === 'active'
                ? 'No stocks are currently trading above their 3-year high'
                : 'Add stocks to your watchlist to start tracking breakouts'}
            </div>
          </div>
        ) : (
          <div className="stock-list">
            {displayList.map(stock => {
              const isActive = stock.current_price && stock.three_year_high && stock.current_price > stock.three_year_high
              const pctAbove3yr = stock.current_price && stock.three_year_high
                ? ((stock.current_price - stock.three_year_high) / stock.three_year_high * 100) : null
              const pctFromATH = stock.current_price && stock.all_time_high
                ? ((stock.all_time_high - stock.current_price) / stock.all_time_high * 100) : null

              return (
                <div key={stock.symbol} className={`stock-card${isActive ? ' active-breakout' : ''}`}>
                  <div className="stock-top">
                    <div className="stock-left">
                      {isActive && <span style={{ fontSize: 22 }}>🏆</span>}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="stock-symbol">{stock.symbol}</span>
                          {isActive && <span className="breakout-badge">Breakout Active</span>}
                        </div>
                        {stock.last_breakout_signal && (
                          <div className="stock-date">
                            Last signal: {new Date(stock.last_breakout_signal).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="stock-right">
                      {stock.current_price && (
                        <div className="stock-price">PKR {stock.current_price.toFixed(2)}</div>
                      )}
                      {stock.breakout_count != null && stock.breakout_count > 0 && (
                        <div className="stock-count">{stock.breakout_count} breakout signal{stock.breakout_count !== 1 ? 's' : ''}</div>
                      )}
                    </div>
                  </div>

                  <div className="metrics-grid">
                    <div className="metric-box">
                      <div className="metric-label">3yr High</div>
                      <div className="metric-value">PKR {stock.three_year_high ? stock.three_year_high.toFixed(2) : '--'}</div>
                      {pctAbove3yr !== null && (
                        <div className="metric-sub" style={{ color: pctAbove3yr >= 0 ? '#16a34a' : '#a09e99' }}>
                          {pctAbove3yr >= 0 ? `+${pctAbove3yr.toFixed(1)}% above` : `${pctAbove3yr.toFixed(1)}% below`}
                        </div>
                      )}
                    </div>
                    <div className="metric-box">
                      <div className="metric-label">All Time High</div>
                      <div className="metric-value" style={{ color: '#d97706' }}>PKR {stock.all_time_high ? stock.all_time_high.toFixed(2) : '--'}</div>
                      {stock.all_time_high_date && (
                        <div className="metric-sub" style={{ color: '#a09e99' }}>
                          {new Date(stock.all_time_high_date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>
                    <div className="metric-box">
                      <div className="metric-label">From ATH</div>
                      <div className="metric-value" style={{ color: pctFromATH !== null && pctFromATH <= 5 ? '#d97706' : '#a09e99' }}>
                        {pctFromATH !== null ? `-${pctFromATH.toFixed(1)}%` : '--'}
                      </div>
                      {pctFromATH !== null && pctFromATH <= 5 && (
                        <div className="metric-sub" style={{ color: '#d97706' }}>Near ATH!</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}