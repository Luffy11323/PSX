'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

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

  .settings-root {
    min-height: 100vh;
    background: #f7f6f3;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    color: #1a1917;
    padding-bottom: 60px;
  }

  .settings-header {
    background: white;
    border-bottom: 1px solid #e8e6e0;
    padding: 0 40px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .settings-header-left { display: flex; align-items: center; gap: 12px; }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
    color: #9e9c97;
    font-size: 13px;
    font-weight: 500;
    padding: 6px 10px;
    border-radius: 8px;
    transition: all 0.15s;
    border: 1px solid transparent;
  }
  .back-btn:hover { background: #f7f6f3; border-color: #e8e6e0; color: #1a1917; }

  .header-divider { width: 1px; height: 20px; background: #e8e6e0; }
  .header-title { font-size: 16px; font-weight: 700; color: #1a1917; letter-spacing: -0.3px; }
  .header-sub { font-size: 11px; color: #a09e99; }

  .save-btn {
    height: 38px;
    padding: 0 20px;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    gap: 6px;
    box-shadow: 0 2px 8px rgba(99,102,241,0.25);
  }
  .save-btn:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
  .save-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .settings-body {
    max-width: 620px;
    margin: 0 auto;
    padding: 32px 20px 0;
  }

  .section-card {
    background: white;
    border: 1px solid #e8e6e0;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0ede6;
  }

  .section-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
    background: #f0f0ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  .section-title { font-size: 13px; font-weight: 600; color: #1a1917; letter-spacing: -0.1px; }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #f7f6f3;
  }
  .toggle-row:last-child { border-bottom: none; }

  .toggle-label { font-size: 14px; font-weight: 500; color: #1a1917; }
  .toggle-desc { font-size: 12px; color: #a09e99; margin-top: 2px; }

  .toggle-btn {
    width: 44px;
    height: 24px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
    transition: background 0.25s ease, box-shadow 0.25s ease;
  }

  .toggle-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    position: absolute;
    top: 3px;
    transition: left 0.25s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }

  .text-input {
    width: 100%;
    height: 44px;
    background: #fafaf8;
    border: 1.5px solid #e8e6e0;
    border-radius: 10px;
    padding: 0 14px;
    font-size: 14px;
    font-family: inherit;
    color: #1a1917;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .text-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  .text-input::placeholder { color: #c4c1ba; }

  .range-wrap { display: flex; align-items: center; gap: 16px; }

  .range-input {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    border-radius: 2px;
    background: #e8e6e0;
    outline: none;
    cursor: pointer;
  }
  .range-input::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #6366f1;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(99,102,241,0.3);
    transition: transform 0.15s;
  }
  .range-input::-webkit-slider-thumb:hover { transform: scale(1.2); }

  .range-labels { display: flex; justify-content: space-between; font-size: 11px; color: #a09e99; margin-top: 6px; }

  .range-value {
    font-family: 'DM Mono', 'Courier New', monospace;
    font-size: 14px;
    font-weight: 500;
    color: #6366f1;
    background: #f0f0ff;
    border: 1px solid #c7d2fe;
    border-radius: 8px;
    padding: 6px 14px;
    min-width: 64px;
    text-align: center;
    flex-shrink: 0;
  }

  .field-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #a09e99;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 7px;
  }

  .time-row { display: flex; gap: 12px; margin-top: 16px; }
  .time-col { flex: 1; }

  .time-input, .select-input {
    width: 100%;
    height: 44px;
    background: #fafaf8;
    border: 1.5px solid #e8e6e0;
    border-radius: 10px;
    padding: 0 14px;
    font-size: 14px;
    font-family: inherit;
    color: #1a1917;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
    appearance: none;
    -webkit-appearance: none;
  }
  .time-input:focus, .select-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
  }

  .loading-overlay {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
  }
  .loading-dots { display: flex; gap: 6px; }
  .loading-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #6366f1;
    animation: bounce 1.2s infinite;
  }
  .loading-dot:nth-child(2) { animation-delay: 0.15s; }
  .loading-dot:nth-child(3) { animation-delay: 0.3s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner {
    display: inline-block;
    width: 13px; height: 13px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
`

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchWithAuth('/api/settings').then(r => r.json()).then(({ data }) => setSettings(data))
  }, [])

  const save = async () => {
    setSaving(true)
    const res = await fetchWithAuth('/api/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    })
    if (res.ok) toast.success('Settings saved')
    else toast.error('Failed to save')
    setSaving(false)
  }

  const toggle = (field: string) =>
    setSettings((s: any) => ({ ...s, [field]: !s[field] }))

  const Toggle = ({ label, desc, field }: { label: string; desc?: string; field: string }) => {
    const on = settings?.[field]
    return (
      <div className="toggle-row">
        <div style={{ flex: 1, paddingRight: 16 }}>
          <div className="toggle-label">{label}</div>
          {desc && <div className="toggle-desc">{desc}</div>}
        </div>
        <button
          className="toggle-btn"
          onClick={() => toggle(field)}
          style={{
            background: on ? '#6366f1' : '#e5e2db',
            boxShadow: on ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
          }}
        >
          <div className="toggle-thumb" style={{ left: on ? 23 : 3 }} />
        </button>
      </div>
    )
  }

  return (
    <div className="settings-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="settings-header">
        <div className="settings-header-left">
          <a href="/dashboard" className="back-btn">← Back</a>
          <div className="header-divider" />
          <div>
            <div className="header-title">Settings</div>
            <div className="header-sub">System configuration</div>
          </div>
        </div>
        <button onClick={save} disabled={saving || !settings} className="save-btn">
          {saving ? <><span className="spinner" /> Saving…</> : <>✓ Save changes</>}
        </button>
      </header>

      <div className="settings-body">
        {!settings ? (
          <div className="loading-overlay">
            <div className="loading-dots">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
          </div>
        ) : (
          <>
            <div className="section-card">
              <div className="section-header">
                <div className="section-icon">✉️</div>
                <span className="section-title">Alert Email</span>
              </div>
              <input
                type="email"
                value={settings.alert_email || ''}
                onChange={e => setSettings((s: any) => ({ ...s, alert_email: e.target.value }))}
                placeholder="alerts@youremail.com"
                className="text-input"
              />
            </div>

            <div className="section-card">
              <div className="section-header">
                <div className="section-icon">⏱</div>
                <span className="section-title">Poll Interval</span>
              </div>
              <div className="range-wrap">
                <div style={{ flex: 1 }}>
                  <input
                    type="range"
                    min={60}
                    max={120}
                    step={10}
                    value={settings.poll_interval_seconds}
                    onChange={e => setSettings((s: any) => ({ ...s, poll_interval_seconds: parseInt(e.target.value) }))}
                    className="range-input"
                  />
                  <div className="range-labels">
                    <span>60s · faster</span>
                    <span>120s · slower</span>
                  </div>
                </div>
                <div className="range-value">{settings.poll_interval_seconds}s</div>
              </div>
            </div>

            <div className="section-card">
              <div className="section-header">
                <div className="section-icon">🔔</div>
                <span className="section-title">Signal Alerts</span>
              </div>
              <Toggle label="Alert on 1/3 Signals" desc="Notify when only 1 layer agrees" field="alert_on_1_of_3" />
              <Toggle label="Alert on 2/3 Signals" desc="Notify when 2 layers agree" field="alert_on_2_of_3" />
              <Toggle label="Alert on 3/3 Signals" desc="Notify when all 3 layers agree (Strong)" field="alert_on_3_of_3" />
              <Toggle label="Alert on Line Crossings" desc="Buy/Sell line price alerts" field="alert_on_line_crossing" />
            </div>

            <div className="section-card">
              <div className="section-header">
                <div className="section-icon">🌙</div>
                <span className="section-title">Quiet Hours</span>
              </div>
              <Toggle label="Enable Quiet Hours" desc="No alerts during specified hours" field="quiet_hours_enabled" />
              {settings.quiet_hours_enabled && (
                <div className="time-row">
                  <div className="time-col">
                    <label className="field-label">Start</label>
                    <input
                      type="time"
                      value={settings.quiet_hours_start}
                      onChange={e => setSettings((s: any) => ({ ...s, quiet_hours_start: e.target.value }))}
                      className="time-input"
                    />
                  </div>
                  <div className="time-col">
                    <label className="field-label">End</label>
                    <input
                      type="time"
                      value={settings.quiet_hours_end}
                      onChange={e => setSettings((s: any) => ({ ...s, quiet_hours_end: e.target.value }))}
                      className="time-input"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="section-card">
              <div className="section-header">
                <div className="section-icon">📋</div>
                <span className="section-title">Weekly Report</span>
              </div>
              <Toggle label="Enable Weekly Reports" desc="Receive a summary every week via email" field="weekly_report_enabled" />
              {settings.weekly_report_enabled && (
                <div className="time-row">
                  <div className="time-col">
                    <label className="field-label">Day</label>
                    <select
                      value={settings.weekly_report_day}
                      onChange={e => setSettings((s: any) => ({ ...s, weekly_report_day: parseInt(e.target.value) }))}
                      className="select-input"
                    >
                      <option value={1}>Monday</option>
                      <option value={2}>Tuesday</option>
                      <option value={3}>Wednesday</option>
                      <option value={4}>Thursday</option>
                      <option value={5}>Friday</option>
                      <option value={6}>Saturday</option>
                      <option value={0}>Sunday</option>
                    </select>
                  </div>
                  <div className="time-col">
                    <label className="field-label">Time</label>
                    <input
                      type="time"
                      value={settings.weekly_report_time}
                      onChange={e => setSettings((s: any) => ({ ...s, weekly_report_time: e.target.value }))}
                      className="time-input"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}