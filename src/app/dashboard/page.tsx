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
    <div className="min-h-screen bg-sentinel-bg scanline">
      <header className="border-b border-sentinel-border bg-sentinel-surface px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <span className="font-display text-2xl text-sentinel-accent tracking-widest">SENTINEL</span>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-sentinel-green pulse-dot" />
            <span className="text-xs text-sentinel-green tracking-widest">LIVE</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs">
          <div className="text-center">
            <div className="text-sentinel-subtext tracking-widest">SIGNALS</div>
            <div className="text-sentinel-text font-bold">{stats.total}</div>
          </div>
          <div className="text-center">
            <div className="text-sentinel-subtext tracking-widest">ALERTS</div>
            <div className="text-sentinel-accent font-bold">{stats.alerts}</div>
          </div>
          <div className="text-center">
            <div className="text-sentinel-subtext tracking-widest">STRONG 3/3</div>
            <div className="text-sentinel-green font-bold">{stats.strong}</div>
          </div>
          <div className="text-center">
            <div className="text-sentinel-subtext tracking-widest">BREAKOUTS</div>
            <div className="text-sentinel-yellow font-bold">{stats.breakouts}</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a href="/dashboard/settings" className="text-xs text-sentinel-subtext hover:text-sentinel-accent tracking-widest uppercase transition-colors">
            SETTINGS
          </a>
          <button onClick={handleLogout} className="text-xs text-sentinel-subtext hover:text-sentinel-red tracking-widest uppercase transition-colors">
            LOGOUT
          </button>
        </div>
      </header>

      <div className="flex h-[calc(100vh-57px)]">
        <aside className="w-64 shrink-0 bg-sentinel-surface border-r border-sentinel-border flex flex-col">
          <div className="px-4 py-3 border-b border-sentinel-border flex items-center justify-between">
            <span className="text-xs tracking-[3px] text-sentinel-subtext uppercase">WATCHLIST</span>
            <button onClick={() => setShowAddForm(!showAddForm)} className="text-sentinel-accent hover:text-white text-lg leading-none transition-colors">
              {showAddForm ? '✕' : '+'}
            </button>
          </div>

          {showAddForm && (
            <div className="p-3 border-b border-sentinel-border bg-sentinel-card animate-slide-up">
              <input
                value={newSymbol}
                onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleAddStock()}
                placeholder="SYMBOL e.g. LUCK"
                className="w-full bg-sentinel-bg border border-sentinel-border rounded px-3 py-2 text-xs text-sentinel-text focus:outline-none focus:border-sentinel-accent mb-2"
                maxLength={10}
              />
              <button
                onClick={handleAddStock}
                disabled={addingStock || !newSymbol}
                className="w-full bg-sentinel-accent text-sentinel-bg text-xs py-2 rounded font-bold tracking-widest disabled:opacity-50"
              >
                {addingStock ? 'ADDING...' : 'ADD STOCK'}
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="skeleton h-16 rounded" />)}
              </div>
            ) : watchlist.length === 0 ? (
              <div className="p-6 text-center text-xs text-sentinel-muted">
                <div className="text-2xl mb-2">📊</div>
                <div>No stocks yet</div>
                <div className="mt-1 text-sentinel-accent cursor-pointer" onClick={() => setShowAddForm(true)}>
                  + Add your first stock
                </div>
              </div>
            ) : (
              watchlist.map(item => {
                const latest = latestSignals[item.symbol]
                const score = latest?.consensus_score ?? -1
                const isSelected = selectedSymbol === item.symbol
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedSymbol(item.symbol)}
                    className={`p-3 border-b border-sentinel-border cursor-pointer transition-all group ${isSelected ? 'bg-sentinel-card border-l-2 border-l-sentinel-accent' : 'hover:bg-sentinel-card'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-sentinel-text tracking-widest">{item.symbol}</div>
                        <div className="text-xs text-sentinel-muted mt-0.5 truncate w-36">{item.company_name || 'PSX Stock'}</div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handleRemoveStock(item.id, item.symbol) }}
                        className="opacity-0 group-hover:opacity-100 text-sentinel-red text-xs hover:text-red-400 transition-all"
                      >✕</button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      {latest ? (
                        <>
                          <div className="flex gap-0.5">
                            {[1, 2, 3].map(i => (
                              <div key={i} className={`w-5 h-1 rounded-full ${i <= score ? score === 3 ? 'bg-sentinel-green' : score === 2 ? 'bg-sentinel-accent' : 'bg-sentinel-yellow' : 'bg-sentinel-border'}`} />
                            ))}
                          </div>
                          <span className={`text-xs font-bold ${score === 3 ? 'text-sentinel-green' : score === 2 ? 'text-sentinel-accent' : score === 1 ? 'text-sentinel-yellow' : 'text-sentinel-muted'}`}>
                            {score >= 0 ? `${score}/3` : '--'}
                          </span>
                          {latest.is_alltime_breakout && <span className="text-xs">🏆</span>}
                          {latest.alert_sent && <span className="text-xs text-sentinel-accent">🔔</span>}
                        </>
                      ) : (
                        <span className="text-xs text-sentinel-muted">Awaiting signal...</span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1.5 text-xs">
                      {item.buy_line && <span className="text-sentinel-green">B:{item.buy_line}</span>}
                      {item.sell_line && <span className="text-sentinel-red">S:{item.sell_line}</span>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          {!selectedSymbol ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-sentinel-muted">
                <div className="font-display text-4xl mb-3 text-sentinel-border">SELECT A STOCK</div>
                <div className="text-sm">Choose from your watchlist or add a new stock</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                {(['chart', 'signals', 'all_signals'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 text-xs rounded tracking-widest uppercase transition-all ${activeTab === tab ? 'bg-sentinel-accent text-sentinel-bg font-bold' : 'bg-sentinel-card text-sentinel-subtext hover:text-sentinel-text border border-sentinel-border'}`}
                  >
                    {tab === 'chart' ? '📊 LIVE CHART' : tab === 'signals' ? `🧠 SIGNALS (${selectedSignals.length})` : `📋 ALL SIGNALS (${signals.length})`}
                  </button>
                ))}
              </div>

              {activeTab === 'chart' && selectedItem && (
                <div className="space-y-4">
                  <LiveChart
                    symbol={selectedSymbol}
                    buyLine={selectedItem.buy_line}
                    sellLine={selectedItem.sell_line}
                    allTimeHigh={ath?.all_time_high || null}
                    threeYearHigh={ath?.three_year_high || null}
                    onBuyLineChange={(price) => handleUpdateLines(selectedSymbol, price, selectedItem.sell_line)}
                    onSellLineChange={(price) => handleUpdateLines(selectedSymbol, selectedItem.buy_line, price)}
                  />
                  {selectedSignals[0] && (
                    <div>
                      <div className="text-xs text-sentinel-subtext tracking-widest uppercase mb-3">LATEST SIGNAL</div>
                      <SignalCard signal={selectedSignals[0]} />
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'signals' && (
                <div className="space-y-3">
                  <div className="text-xs text-sentinel-subtext tracking-widest uppercase mb-3">SIGNAL HISTORY — {selectedSymbol}</div>
                  {selectedSignals.length === 0 ? (
                    <div className="text-center text-sentinel-muted py-12 text-xs">No signals yet — waiting for next poll cycle</div>
                  ) : (
                    selectedSignals.map(signal => <SignalCard key={signal.id} signal={signal} compact />)
                  )}
                </div>
              )}

              {activeTab === 'all_signals' && (
                <div className="space-y-2">
                  <div className="text-xs text-sentinel-subtext tracking-widest uppercase mb-3">ALL SIGNAL HISTORY</div>
                  {signals.map(signal => <SignalCard key={signal.id} signal={signal} compact />)}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}