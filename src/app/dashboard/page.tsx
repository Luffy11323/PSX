'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import LiveChart from '@/components/LiveChart'
import SignalCard from '@/components/SignalCard'
import { toast } from 'sonner'

interface WatchlistItem {
  id: string
  symbol: string
  company_name: string
  buy_line: number | null
  sell_line: number | null
}

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

interface ATHData {
  all_time_high: number
  three_year_high: number
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

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [signals, setSignals] = useState<SignalLog[]>([])
  const [athData, setAthData] = useState<Record<string, ATHData>>({})
  const [loading, setLoading] = useState(true)
  const [newSymbol, setNewSymbol] = useState('')
  const [addingStock, setAddingStock] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'chart' | 'signals' | 'all_signals'>('chart')
  const [stats, setStats] = useState({ total: 0, alerts: 0, breakouts: 0, strong: 0 })
  const router = useRouter()

  useEffect(() => {
    loadData()
    const interval = setInterval(loadSignals, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [wlRes, signalRes] = await Promise.all([
        fetchWithAuth('/api/watchlist'),
        fetchWithAuth('/api/signals?limit=100'),
      ])
      const [wl, sig] = await Promise.all([wlRes.json(), signalRes.json()])

      setWatchlist(wl.data || [])
      setSignals(sig.data || [])

      if (wl.data?.length > 0) {
        setSelectedSymbol((prev) => prev ?? wl.data[0].symbol)
      }

      const sigData = sig.data || []
      setStats({
        total: sigData.length,
        alerts: sigData.filter((s: SignalLog) => s.alert_sent).length,
        breakouts: sigData.filter((s: SignalLog) => s.is_alltime_breakout).length,
        strong: sigData.filter((s: SignalLog) => s.consensus_score === 3).length,
      })

      const symbols = (wl.data || []).map((w: WatchlistItem) => w.symbol)
      await loadATHData(symbols)
    } catch (err) {
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadSignals = async () => {
    const res = await fetchWithAuth('/api/signals?limit=100')
    const { data } = await res.json()
    setSignals(data || [])
  }

  const loadATHData = async (symbols: string[]) => {
    const results: Record<string, ATHData> = {}
    await Promise.all(
      symbols.map(async (sym) => {
        try {
          const res = await fetchWithAuth(`/api/stocks/${sym}/price`)
          const { allTimeHigh } = await res.json()
          if (allTimeHigh) results[sym] = allTimeHigh
        } catch {}
      })
    )
    setAthData(results)
  }

  const handleAddStock = async () => {
    if (!newSymbol.trim()) return
    setAddingStock(true)
    try {
      const res = await fetchWithAuth('/api/watchlist', {
        method: 'POST',
        body: JSON.stringify({ symbol: newSymbol.trim().toUpperCase() }),
      })
      if (!res.ok) throw new Error('Failed to add')
      toast.success(`${newSymbol.toUpperCase()} added to watchlist`)
      setNewSymbol('')
      setShowAddForm(false)
      loadData()
    } catch {
      toast.error('Failed to add stock')
    } finally {
      setAddingStock(false)
    }
  }

  const handleRemoveStock = async (id: string, symbol: string) => {
    await fetchWithAuth(`/api/watchlist?id=${id}`, { method: 'DELETE' })
    toast.success(`${symbol} removed`)
    loadData()
  }

  const handleUpdateLines = async (symbol: string, buyLine: number | null, sellLine: number | null) => {
    const item = watchlist.find(w => w.symbol === symbol)
    if (!item) return
    await fetchWithAuth('/api/watchlist', {
      method: 'PATCH',
      body: JSON.stringify({ id: item.id, buy_line: buyLine, sell_line: sellLine }),
    })
    setWatchlist(prev => prev.map(w =>
      w.symbol === symbol ? { ...w, buy_line: buyLine, sell_line: sellLine } : w
    ))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const selectedItem = watchlist.find(w => w.symbol === selectedSymbol)
  const selectedSignals = signals.filter(s => s.symbol === selectedSymbol)
  const ath = selectedSymbol ? athData[selectedSymbol] : null

  const latestSignals = watchlist.reduce((acc, item) => {
    const sig = signals.find(s => s.symbol === item.symbol)
    if (sig) acc[item.symbol] = sig
    return acc
  }, {} as Record<string, SignalLog>)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700&family=DM+Mono:wght@300;400;500&display=swap');

        * { box-sizing: border-box; }

        :root {
          --bg: #f7f6f3;
          --surface: #ffffff;
          --card: #fafaf8;
          --border: #e8e6e0;
          --border-soft: #f0ede6;
          --text: #1a1916;
          --subtext: #6b6860;
          --muted: #a09e99;
          --accent: #2563eb;
          --accent-soft: #eff4ff;
          --accent-mid: #93b4fd;
          --green: #16a34a;
          --green-soft: #f0fdf4;
          --red: #dc2626;
          --red-soft: #fef2f2;
          --yellow: #d97706;
          --yellow-soft: #fffbeb;
          --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
          --shadow-md: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
          --radius: 12px;
          --radius-sm: 8px;
          --radius-lg: 16px;
        }

        body { background: var(--bg); font-family: 'Bricolage Grotesque', sans-serif; }

        .dash-root {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: 'Bricolage Grotesque', sans-serif;
        }

        .dash-header {
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          padding: 0 28px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: var(--shadow-sm);
        }

        .header-brand { display: flex; align-items: center; gap: 12px; }

        .brand-name {
          font-family: 'Bricolage Grotesque', sans-serif;
          font-weight: 700;
          font-size: 18px;
          color: var(--text);
          letter-spacing: -0.3px;
        }

        .live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--green-soft);
          border: 1px solid #bbf7d0;
          border-radius: 20px;
          padding: 3px 10px;
        }

        .live-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          animation: pulse-green 2s infinite;
        }

        @keyframes pulse-green {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }

        .live-text { font-size: 11px; font-weight: 600; color: var(--green); letter-spacing: 0.5px; }

        .header-stats { display: flex; align-items: center; gap: 4px; }
        @media (max-width: 768px) { .header-stats { display: none; } }

        .stat-pill {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 6px 14px;
          border-radius: 10px;
          background: var(--card);
          border: 1px solid var(--border);
          min-width: 64px;
        }

        .stat-label { font-size: 10px; font-weight: 500; color: var(--muted); letter-spacing: 0.3px; text-transform: uppercase; }

        .stat-value { font-family: 'DM Mono', monospace; font-size: 15px; font-weight: 500; color: var(--text); line-height: 1.2; }
        .stat-value.accent { color: var(--accent); }
        .stat-value.green { color: var(--green); }
        .stat-value.yellow { color: var(--yellow); }

        .header-actions { display: flex; align-items: center; gap: 8px; }

        .btn-ghost {
          background: none;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 500;
          color: var(--subtext);
          cursor: pointer;
          transition: all 0.15s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          font-family: 'Bricolage Grotesque', sans-serif;
        }

        .btn-ghost:hover { background: var(--card); color: var(--text); border-color: var(--muted); }
        .btn-ghost.danger:hover { background: var(--red-soft); color: var(--red); border-color: #fca5a5; }

        .dash-body { display: flex; height: calc(100vh - 60px); }

        .sidebar {
          width: 260px;
          flex-shrink: 0;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
        }

        .sidebar-header {
          padding: 16px 16px 12px;
          border-bottom: 1px solid var(--border-soft);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-title { font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; }

        .btn-icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--card);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          color: var(--subtext);
          transition: all 0.15s ease;
          line-height: 1;
        }

        .btn-icon:hover { background: var(--accent-soft); border-color: var(--accent-mid); color: var(--accent); }

        .add-form {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border-soft);
          background: var(--card);
          animation: slide-down 0.2s ease;
        }

        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .input-field {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          font-size: 13px;
          font-family: 'DM Mono', monospace;
          color: var(--text);
          outline: none;
          transition: border-color 0.15s;
          margin-bottom: 8px;
        }

        .input-field::placeholder { color: var(--muted); }
        .input-field:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }

        .btn-primary {
          width: 100%;
          background: var(--accent);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          letter-spacing: 0.3px;
          font-family: 'Bricolage Grotesque', sans-serif;
        }

        .btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        .watchlist-scroll { flex: 1; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }

        .watchlist-item {
          padding: 12px 14px;
          border-bottom: 1px solid var(--border-soft);
          cursor: pointer;
          transition: background 0.12s ease;
          position: relative;
        }

        .watchlist-item:hover { background: var(--card); }

        .watchlist-item.active {
          background: var(--accent-soft);
          border-left: 3px solid var(--accent);
        }

        .watchlist-item.active .symbol-text { color: var(--accent); }

        .item-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; }

        .symbol-text { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; color: var(--text); letter-spacing: 0.3px; }

        .company-text { font-size: 11px; color: var(--muted); margin-top: 1px; max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .remove-btn {
          opacity: 0;
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 13px;
          padding: 2px 4px;
          border-radius: 4px;
          transition: all 0.15s;
        }

        .watchlist-item:hover .remove-btn { opacity: 1; }
        .remove-btn:hover { color: var(--red); background: var(--red-soft); }

        .score-bars { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
        .bars { display: flex; gap: 3px; }

        .bar { width: 20px; height: 3px; border-radius: 2px; background: var(--border); transition: background 0.2s; }
        .bar.filled-3 { background: var(--green); }
        .bar.filled-2 { background: var(--accent); }
        .bar.filled-1 { background: var(--yellow); }

        .score-label { font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500; }
        .score-label.s3 { color: var(--green); }
        .score-label.s2 { color: var(--accent); }
        .score-label.s1 { color: var(--yellow); }
        .score-label.s0 { color: var(--muted); }

        .price-lines { display: flex; gap: 8px; margin-top: 4px; }

        .price-tag { font-family: 'DM Mono', monospace; font-size: 10px; padding: 2px 7px; border-radius: 5px; font-weight: 500; }
        .price-tag.buy { background: var(--green-soft); color: var(--green); border: 1px solid #bbf7d0; }
        .price-tag.sell { background: var(--red-soft); color: var(--red); border: 1px solid #fca5a5; }

        .awaiting-text { font-size: 11px; color: var(--muted); }

        .skeleton {
          background: linear-gradient(90deg, var(--border-soft) 25%, var(--border) 50%, var(--border-soft) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: var(--radius-sm);
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .empty-state { padding: 32px 16px; text-align: center; }
        .empty-icon { font-size: 28px; margin-bottom: 8px; }
        .empty-title { font-size: 13px; color: var(--subtext); margin-bottom: 4px; }
        .empty-link { font-size: 12px; color: var(--accent); cursor: pointer; }
        .empty-link:hover { text-decoration: underline; }

        .main-content { flex: 1; overflow-y: auto; padding: 24px; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }

        .no-selection { height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 8px; color: var(--muted); }
        .no-selection-icon { font-size: 40px; opacity: 0.4; }
        .no-selection-title { font-size: 18px; font-weight: 600; color: var(--subtext); }
        .no-selection-sub { font-size: 13px; }

        .tab-bar {
          display: flex;
          gap: 4px;
          margin-bottom: 20px;
          background: var(--surface);
          padding: 4px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          width: fit-content;
          box-shadow: var(--shadow-sm);
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 7px 16px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 500;
          color: var(--subtext);
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          font-family: 'Bricolage Grotesque', sans-serif;
        }

        .tab-btn:hover { color: var(--text); background: var(--card); }

        .tab-btn.active {
          background: var(--accent);
          color: white;
          box-shadow: 0 2px 8px rgba(37,99,235,0.2);
        }

        .section-label { font-size: 11px; font-weight: 600; color: var(--muted); letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 12px; }

        .signals-list { display: flex; flex-direction: column; gap: 10px; }

        .empty-signals { text-align: center; color: var(--muted); font-size: 13px; padding: 60px 0; }
      `}</style>

      <div className="dash-root">
        <header className="dash-header">
          <div className="header-brand">
            <span className="brand-name">Sentinel</span>
            <div className="live-badge">
              <div className="live-dot" />
              <span className="live-text">Live</span>
            </div>
          </div>

          <div className="header-stats">
            <div className="stat-pill">
              <span className="stat-label">Signals</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Alerts</span>
              <span className="stat-value accent">{stats.alerts}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Strong</span>
              <span className="stat-value green">{stats.strong}</span>
            </div>
            <div className="stat-pill">
              <span className="stat-label">Breakouts</span>
              <span className="stat-value yellow">{stats.breakouts}</span>
            </div>
          </div>

          <div className="header-actions">
            <a href="/dashboard/settings" className="btn-ghost">Settings</a>
            <button onClick={handleLogout} className="btn-ghost danger">Log out</button>
          </div>
        </header>

        <div className="dash-body">
          <aside className="sidebar">
            <div className="sidebar-header">
              <span className="sidebar-title">Watchlist</span>
              <button className="btn-icon" onClick={() => setShowAddForm(!showAddForm)}>
                {showAddForm ? '✕' : '+'}
              </button>
            </div>

            {showAddForm && (
              <div className="add-form">
                <input
                  value={newSymbol}
                  onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && handleAddStock()}
                  placeholder="Ticker e.g. LUCK"
                  className="input-field"
                  maxLength={10}
                />
                <button
                  onClick={handleAddStock}
                  disabled={addingStock || !newSymbol}
                  className="btn-primary"
                >
                  {addingStock ? 'Adding…' : 'Add Stock'}
                </button>
              </div>
            )}

            <div className="watchlist-scroll">
              {loading ? (
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton" style={{ height: '68px' }} />
                  ))}
                </div>
              ) : watchlist.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📊</div>
                  <div className="empty-title">No stocks yet</div>
                  <div className="empty-link" onClick={() => setShowAddForm(true)}>+ Add your first stock</div>
                </div>
              ) : (
                watchlist.map(item => {
                  const latest = latestSignals[item.symbol]
                  const score = latest?.consensus_score ?? -1
                  const isSelected = selectedSymbol === item.symbol
                  const barClass = score === 3 ? 'filled-3' : score === 2 ? 'filled-2' : score === 1 ? 'filled-1' : ''
                  const scoreLabelClass = score === 3 ? 's3' : score === 2 ? 's2' : score === 1 ? 's1' : 's0'

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedSymbol(item.symbol)}
                      className={`watchlist-item${isSelected ? ' active' : ''}`}
                    >
                      <div className="item-top">
                        <div>
                          <div className="symbol-text">{item.symbol}</div>
                          <div className="company-text">{item.company_name || 'PSX Stock'}</div>
                        </div>
                        <button
                          className="remove-btn"
                          onClick={e => { e.stopPropagation(); handleRemoveStock(item.id, item.symbol) }}
                        >✕</button>
                      </div>

                      {latest ? (
                        <div className="score-bars">
                          <div className="bars">
                            {[1, 2, 3].map(i => (
                              <div key={i} className={`bar${i <= score ? ` ${barClass}` : ''}`} />
                            ))}
                          </div>
                          <span className={`score-label ${scoreLabelClass}`}>
                            {score >= 0 ? `${score}/3` : '—'}
                          </span>
                          {latest.is_alltime_breakout && <span style={{ fontSize: '12px' }}>🏆</span>}
                          {latest.alert_sent && <span style={{ fontSize: '12px' }}>🔔</span>}
                        </div>
                      ) : (
                        <div className="awaiting-text">Awaiting signal…</div>
                      )}

                      {(item.buy_line || item.sell_line) && (
                        <div className="price-lines">
                          {item.buy_line && <span className="price-tag buy">B {item.buy_line}</span>}
                          {item.sell_line && <span className="price-tag sell">S {item.sell_line}</span>}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </aside>

          <main className="main-content">
            {!selectedSymbol ? (
              <div className="no-selection">
                <div className="no-selection-icon">📈</div>
                <div className="no-selection-title">Select a stock</div>
                <div className="no-selection-sub">Choose from your watchlist or add a new one</div>
              </div>
            ) : (
              <>
                <div className="tab-bar">
                  {(['chart', 'signals', 'all_signals'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`tab-btn${activeTab === tab ? ' active' : ''}`}
                    >
                      {tab === 'chart'
                        ? '📊 Live Chart'
                        : tab === 'signals'
                        ? `🧠 Signals (${selectedSignals.length})`
                        : `📋 All Signals (${signals.length})`}
                    </button>
                  ))}
                </div>

                {activeTab === 'chart' && selectedItem && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <LiveChart
                      symbol={selectedSymbol}
                      buyLine={selectedItem.buy_line}
                      sellLine={selectedItem.sell_line}
                      allTimeHigh={ath?.all_time_high || null}
                      threeYearHigh={ath?.three_year_high || null}
                      onBuyLineChange={(price) => handleUpdateLines(selectedSymbol, price, selectedItem.sell_line)}
                      onSellLineChange={(price) => handleUpdateLines(selectedSymbol, selectedItem.buy_line, price)}
                      getToken={async () => {
                        const { data: { session } } = await supabase.auth.getSession()
                        return session?.access_token
                      }}
                    />
                    {selectedSignals[0] && (
                      <div>
                        <div className="section-label">Latest Signal</div>
                        <SignalCard signal={selectedSignals[0]} />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'signals' && (
                  <div>
                    <div className="section-label">Signal History — {selectedSymbol}</div>
                    {selectedSignals.length === 0 ? (
                      <div className="empty-signals">No signals yet — waiting for next poll cycle</div>
                    ) : (
                      <div className="signals-list">
                        {selectedSignals.map(signal => <SignalCard key={signal.id} signal={signal} compact />)}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'all_signals' && (
                  <div>
                    <div className="section-label">All Signal History</div>
                    <div className="signals-list">
                      {signals.map(signal => <SignalCard key={signal.id} signal={signal} compact />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  )
}