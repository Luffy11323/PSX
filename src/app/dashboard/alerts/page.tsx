'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AlertNotification {
  id: string
  symbol: string
  alert_type: string
  price: number
  message: string
  sent_to: string
  sent_at: string
  signal_log_id: string
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

const ALERT_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  BUY_LINE:      { text: '#16a34a', border: '#bbf7d0', bg: '#f0fdf4' },
  SELL_LINE:     { text: '#dc2626', border: '#fca5a5', bg: '#fef2f2' },
  SIGNAL_1_3:    { text: '#d97706', border: '#fde68a', bg: '#fffbeb' },
  SIGNAL_2_3:    { text: '#2563eb', border: '#93b4fd', bg: '#eff4ff' },
  SIGNAL_3_3:    { text: '#16a34a', border: '#bbf7d0', bg: '#f0fdf4' },
  BREAKOUT:      { text: '#d97706', border: '#fde68a', bg: '#fffbeb' },
  WEEKLY_REPORT: { text: '#2563eb', border: '#93b4fd', bg: '#eff4ff' },
}

const ALERT_ICONS: Record<string, string> = {
  BUY_LINE: '🟢', SELL_LINE: '🔴', SIGNAL_1_3: '⚪',
  SIGNAL_2_3: '🟡', SIGNAL_3_3: '🟢', BREAKOUT: '🏆', WEEKLY_REPORT: '📊',
}

const ALERT_LABELS: Record<string, string> = {
  BUY_LINE: 'Buy Line', SELL_LINE: 'Sell Line',
  SIGNAL_1_3: 'Signal 1/3', SIGNAL_2_3: 'Signal 2/3',
  SIGNAL_3_3: 'Signal 3/3', BREAKOUT: 'Breakout',
  WEEKLY_REPORT: 'Weekly Report',
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

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }

  .stat-card {
    background: white;
    border: 1px solid #e8e6e0;
    border-radius: 12px;
    padding: 14px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .stat-label { font-size: 10px; font-weight: 600; color: #a09e99; letter-spacing: 0.4px; text-transform: uppercase; margin-bottom: 4px; }
  .stat-value { font-size: 24px; font-weight: 700; line-height: 1; }

  .filter-bar { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }

  .filter-btn {
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid #e8e6e0;
    background: white;
    font-size: 12px;
    font-weight: 500;
    color: #6b6860;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .filter-btn:hover { border-color: #6366f1; color: #6366f1; background: #f5f5ff; }
  .filter-btn.active { background: #6366f1; border-color: #6366f1; color: white; }

  .alert-list { display: flex; flex-direction: column; gap: 8px; }

  .alert-card {
    background: white;
    border: 1px solid #e8e6e0;
    border-radius: 12px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 14px;
    transition: box-shadow 0.15s, transform 0.15s;
    border-left-width: 3px;
  }
  .alert-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.07); transform: translateY(-1px); }

  .alert-icon { font-size: 22px; flex-shrink: 0; }

  .alert-body { flex: 1; min-width: 0; }

  .alert-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 3px; }

  .alert-symbol { font-family: 'DM Mono', 'Courier New', monospace; font-size: 14px; font-weight: 600; color: #1a1917; }

  .alert-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 20px;
    border: 1px solid;
  }

  .alert-price { font-family: 'DM Mono', monospace; font-size: 13px; color: #1a1917; }

  .alert-msg { font-size: 12px; color: #9e9c97; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .alert-to { font-size: 11px; color: #c4c1ba; margin-top: 2px; }

  .alert-time { text-align: right; flex-shrink: 0; }
  .alert-date { font-size: 12px; color: #6b6860; }
  .alert-hour { font-size: 11px; color: #a09e99; margin-top: 1px; }

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

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [stats, setStats] = useState({ total: 0, buyLine: 0, sellLine: 0, breakouts: 0, strong: 0 })

  useEffect(() => { loadAlerts() }, [])

  const loadAlerts = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/alerts')
      const { data } = await res.json()
      const alertData: AlertNotification[] = data || []
      setAlerts(alertData)
      setStats({
        total: alertData.length,
        buyLine: alertData.filter(a => a.alert_type === 'BUY_LINE').length,
        sellLine: alertData.filter(a => a.alert_type === 'SELL_LINE').length,
        breakouts: alertData.filter(a => a.alert_type === 'BREAKOUT').length,
        strong: alertData.filter(a => a.alert_type === 'SIGNAL_3_3').length,
      })
    } catch { } finally { setLoading(false) }
  }

  const filtered = filter === 'ALL' ? alerts : alerts.filter(a => a.alert_type === filter)
  const filterTypes = ['ALL', 'BUY_LINE', 'SELL_LINE', 'SIGNAL_3_3', 'SIGNAL_2_3', 'SIGNAL_1_3', 'BREAKOUT', 'WEEKLY_REPORT']

  return (
    <div className="page-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="page-header">
        <div className="header-left">
          <a href="/dashboard" className="brand-link">Sentinel</a>
          <div className="header-divider" />
          <span className="page-title">Alert Log</span>
        </div>
        <nav className="header-nav">
          <a href="/dashboard" className="nav-link">Dashboard</a>
          <a href="/dashboard/breakouts" className="nav-link">Breakouts</a>
          <a href="/dashboard/settings" className="nav-link">Settings</a>
        </nav>
      </header>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: 'Total', value: stats.total, color: '#1a1917' },
            { label: 'Buy Line', value: stats.buyLine, color: '#16a34a' },
            { label: 'Sell Line', value: stats.sellLine, color: '#dc2626' },
            { label: 'Breakouts', value: stats.breakouts, color: '#d97706' },
            { label: 'Strong 3/3', value: stats.strong, color: '#16a34a' },
          ].map(stat => (
            <div key={stat.label} className="stat-card">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="filter-bar">
          {filterTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`filter-btn${filter === type ? ' active' : ''}`}
            >
              {type === 'ALL' ? 'All alerts' : <>{ALERT_ICONS[type]} {ALERT_LABELS[type]}</>}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 68 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔕</div>
            <div className="empty-title">No alerts yet</div>
            <div className="empty-sub">Alerts will appear once signals are triggered</div>
          </div>
        ) : (
          <div className="alert-list">
            {filtered.map(alert => {
              const c = ALERT_COLORS[alert.alert_type] || { text: '#6b6860', border: '#e8e6e0', bg: '#fafaf8' }
              return (
                <div
                  key={alert.id}
                  className="alert-card"
                  style={{ borderLeftColor: c.border }}
                >
                  <div className="alert-icon">{ALERT_ICONS[alert.alert_type] || '📢'}</div>
                  <div className="alert-body">
                    <div className="alert-top">
                      <span className="alert-symbol">{alert.symbol}</span>
                      <span
                        className="alert-badge"
                        style={{ color: c.text, borderColor: c.border, background: c.bg }}
                      >
                        {ALERT_LABELS[alert.alert_type] || alert.alert_type}
                      </span>
                      {alert.price && (
                        <span className="alert-price">PKR {Number(alert.price).toFixed(2)}</span>
                      )}
                    </div>
                    {alert.message && <div className="alert-msg">{alert.message}</div>}
                    {alert.sent_to && <div className="alert-to">→ {alert.sent_to}</div>}
                  </div>
                  <div className="alert-time">
                    <div className="alert-date">
                      {new Date(alert.sent_at).toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short' })}
                    </div>
                    <div className="alert-hour">
                      {new Date(alert.sent_at).toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit' })}
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