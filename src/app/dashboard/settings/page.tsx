'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(({ data }) => setSettings(data))
  }, [])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    if (res.ok) toast.success('Settings saved')
    else toast.error('Failed to save')
    setSaving(false)
  }

  if (!settings) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=DM+Mono:wght@400;500&display=swap');
        .settings-loading {
          min-height: 100vh;
          background: #f7f6f3;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Bricolage Grotesque', sans-serif;
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
      `}</style>
      <div className="settings-loading">
        <div className="loading-dots">
          <div className="loading-dot" />
          <div className="loading-dot" />
          <div className="loading-dot" />
        </div>
      </div>
    </>
  )

  const Section = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
    <div style={{
      background: 'white',
      border: '1px solid #e8e6e0',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '16px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f0ede6' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#f0f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
          {icon}
        </div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1917', letterSpacing: '-0.1px' }}>{title}</span>
      </div>
      {children}
    </div>
  )

  const Toggle = ({ label, desc, field }: { label: string; desc?: string; field: string }) => {
    const on = settings[field]
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f7f6f3' }}>
        <div style={{ flex: 1, paddingRight: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a1917' }}>{label}</div>
          {desc && <div style={{ fontSize: '12px', color: '#a09e99', marginTop: '2px' }}>{desc}</div>}
        </div>
        <button
          onClick={() => setSettings((s: any) => ({ ...s, [field]: !s[field] }))}
          style={{
            width: '44px',
            height: '24px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            flexShrink: 0,
            transition: 'background 0.25s ease',
            background: on ? '#6366f1' : '#e5e2db',
            boxShadow: on ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
          }}
        >
          <div style={{
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: '3px',
            left: on ? '23px' : '3px',
            transition: 'left 0.25s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }} />
        </button>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '44px',
    background: '#fafaf8',
    border: '1.5px solid #e8e6e0',
    borderRadius: '10px',
    padding: '0 14px',
    fontSize: '14px',
    fontFamily: 'Bricolage Grotesque, sans-serif',
    color: '#1a1917',
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 600,
    color: '#a09e99',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    marginBottom: '7px',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; }

        .settings-root {
          min-height: 100vh;
          background: #f7f6f3;
          font-family: 'Bricolage Grotesque', sans-serif;
          color: #1a1917;
          padding: 0 0 60px;
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

        .header-title-group { display: flex; flex-direction: column; }
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
          font-family: 'Bricolage Grotesque', sans-serif;
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

        .range-wrap { display: flex; align-items: center; gap: 16px; }

        .range-input {
          flex: 1;
          -webkit-appearance: none;
          height: 4px;
          border-radius: 2px;
          background: #e8e6e0;
          outline: none;
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
          font-family: 'DM Mono', monospace;
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

        .time-row { display: flex; gap: 12px; margin-top: 16px; }
        .time-col { flex: 1; }

        input[type="time"],
        select {
          width: 100%;
          height: 44px;
          background: #fafaf8;
          border: 1.5px solid #e8e6e0;
          border-radius: 10px;
          padding: 0 14px;
          font-size: 14px;
          font-family: 'Bricolage Grotesque', sans-serif;
          color: #1a1917;
          outline: none;
          transition: border-color 0.15s;
          appearance: none;
          -webkit-appearance: none;
        }

        input[type="time"]:focus,
        select:focus,
        input[type="email"]:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
        }
      `}</style>

      <div className="settings-root">
        <header className="settings-header">
          <div className="settings-header-left">
            <a href="/dashboard" className="back-btn">← Back</a>
            <div style={{ width: '1px', height: '20px', background: '#e8e6e0' }} />
            <div className="header-title-group">
              <div className="header-title">Settings</div>
              <div className="header-sub">System configuration</div>
            </div>
          </div>
          <button onClick={save} disabled={saving} className="save-btn">
            {saving ? (
              <>
                <span style={{ display: 'inline-block', width: 13, height: 13, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Saving…
              </>
            ) : (
              <>✓ Save changes</>
            )}
          </button>
        </header>

        <div className="settings-body">
          <Section title="Alert Email" icon="✉️">
            <input
              type="email"
              value={settings.alert_email || ''}
              onChange={e => setSettings((s: any) => ({ ...s, alert_email: e.target.value }))}
              placeholder="alerts@youremail.com"
              style={inputStyle}
            />
          </Section>

          <Section title="Poll Interval" icon="⏱">
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
          </Section>

          <Section title="Signal Alerts" icon="🔔">
            <Toggle label="Alert on 1/3 Signals" desc="Notify when only 1 layer agrees" field="alert_on_1_of_3" />
            <Toggle label="Alert on 2/3 Signals" desc="Notify when 2 layers agree" field="alert_on_2_of_3" />
            <Toggle label="Alert on 3/3 Signals" desc="Notify when all 3 layers agree (Strong)" field="alert_on_3_of_3" />
            <Toggle label="Alert on Line Crossings" desc="Buy/Sell line price alerts" field="alert_on_line_crossing" />
          </Section>

          <Section title="Quiet Hours" icon="🌙">
            <Toggle label="Enable Quiet Hours" desc="No alerts during specified hours" field="quiet_hours_enabled" />
            {settings.quiet_hours_enabled && (
              <div className="time-row">
                <div className="time-col">
                  <label style={labelStyle}>Start</label>
                  <input
                    type="time"
                    value={settings.quiet_hours_start}
                    onChange={e => setSettings((s: any) => ({ ...s, quiet_hours_start: e.target.value }))}
                  />
                </div>
                <div className="time-col">
                  <label style={labelStyle}>End</label>
                  <input
                    type="time"
                    value={settings.quiet_hours_end}
                    onChange={e => setSettings((s: any) => ({ ...s, quiet_hours_end: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </Section>

          <Section title="Weekly Report" icon="📋">
            <Toggle label="Enable Weekly Reports" desc="Receive a summary every week via email" field="weekly_report_enabled" />
            {settings.weekly_report_enabled && (
              <div className="time-row">
                <div className="time-col">
                  <label style={labelStyle}>Day</label>
                  <select
                    value={settings.weekly_report_day}
                    onChange={e => setSettings((s: any) => ({ ...s, weekly_report_day: parseInt(e.target.value) }))}
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
                  <label style={labelStyle}>Time</label>
                  <input
                    type="time"
                    value={settings.weekly_report_time}
                    onChange={e => setSettings((s: any) => ({ ...s, weekly_report_time: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}