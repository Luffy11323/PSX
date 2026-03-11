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
    <div className="min-h-screen bg-sentinel-bg flex items-center justify-center">
      <div className="text-sentinel-subtext text-xs tracking-widest animate-pulse">LOADING...</div>
    </div>
  )

  const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="bg-sentinel-card border border-sentinel-border rounded-lg p-6 mb-5">
      <div className="text-xs text-sentinel-subtext tracking-[3px] uppercase mb-5 pb-3 border-b border-sentinel-border">
        {title}
      </div>
      {children}
    </div>
  )

  const Toggle = ({ label, desc, field }: { label: string, desc?: string, field: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-sentinel-border last:border-0">
      <div>
        <div className="text-sm text-sentinel-text">{label}</div>
        {desc && <div className="text-xs text-sentinel-muted mt-0.5">{desc}</div>}
      </div>
      <button
        onClick={() => setSettings((s: any) => ({ ...s, [field]: !s[field] }))}
        className={`w-12 h-6 rounded-full transition-all relative ${
          settings[field] ? 'bg-sentinel-accent' : 'bg-sentinel-border'
        }`}
      >
        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
          settings[field] ? 'left-7' : 'left-1'
        }`} />
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-sentinel-bg p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="font-display text-3xl text-sentinel-accent tracking-widest">SETTINGS</div>
          <div className="text-xs text-sentinel-subtext tracking-widest mt-1">System Configuration</div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="bg-sentinel-accent text-sentinel-bg px-6 py-2 rounded text-xs font-bold tracking-widest disabled:opacity-50"
        >
          {saving ? 'SAVING...' : 'SAVE CHANGES'}
        </button>
      </div>

      <Section title="Alert Email">
        <input
          type="email"
          value={settings.alert_email || ''}
          onChange={e => setSettings((s: any) => ({ ...s, alert_email: e.target.value }))}
          placeholder="alerts@youremail.com"
          className="w-full bg-sentinel-bg border border-sentinel-border rounded px-4 py-3 text-sm text-sentinel-text focus:outline-none focus:border-sentinel-accent"
        />
      </Section>

      <Section title="Poll Interval">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="range"
              min={60}
              max={120}
              step={10}
              value={settings.poll_interval_seconds}
              onChange={e => setSettings((s: any) => ({ ...s, poll_interval_seconds: parseInt(e.target.value) }))}
              className="w-full accent-sentinel-accent"
            />
            <div className="flex justify-between text-xs text-sentinel-muted mt-1">
              <span>60s (faster)</span>
              <span>120s (slower)</span>
            </div>
          </div>
          <div className="bg-sentinel-bg border border-sentinel-accent rounded px-4 py-2 text-sentinel-accent font-bold text-sm w-24 text-center">
            {settings.poll_interval_seconds}s
          </div>
        </div>
      </Section>

      <Section title="Signal Alerts">
        <Toggle label="Alert on 1/3 Signals" desc="Notify when only 1 layer agrees" field="alert_on_1_of_3" />
        <Toggle label="Alert on 2/3 Signals" desc="Notify when 2 layers agree" field="alert_on_2_of_3" />
        <Toggle label="Alert on 3/3 Signals" desc="Notify when all 3 layers agree (STRONG)" field="alert_on_3_of_3" />
        <Toggle label="Alert on Line Crossings" desc="BUY/SELL line price alerts" field="alert_on_line_crossing" />
      </Section>

      <Section title="Quiet Hours">
        <Toggle label="Enable Quiet Hours" desc="No alerts during specified hours" field="quiet_hours_enabled" />
        {settings.quiet_hours_enabled && (
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <label className="text-xs text-sentinel-subtext tracking-widest mb-2 block">START</label>
              <input
                type="time"
                value={settings.quiet_hours_start}
                onChange={e => setSettings((s: any) => ({ ...s, quiet_hours_start: e.target.value }))}
                className="w-full bg-sentinel-bg border border-sentinel-border rounded px-3 py-2 text-sm text-sentinel-text focus:outline-none focus:border-sentinel-accent"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-sentinel-subtext tracking-widest mb-2 block">END</label>
              <input
                type="time"
                value={settings.quiet_hours_end}
                onChange={e => setSettings((s: any) => ({ ...s, quiet_hours_end: e.target.value }))}
                className="w-full bg-sentinel-bg border border-sentinel-border rounded px-3 py-2 text-sm text-sentinel-text focus:outline-none focus:border-sentinel-accent"
              />
            </div>
          </div>
        )}
      </Section>

      <Section title="Weekly Report">
        <Toggle label="Enable Weekly Reports" desc="Receive summary every week via email" field="weekly_report_enabled" />
        {settings.weekly_report_enabled && (
          <div className="flex gap-4 mt-4">
            <div className="flex-1">
              <label className="text-xs text-sentinel-subtext tracking-widest mb-2 block">DAY</label>
              <select
                value={settings.weekly_report_day}
                onChange={e => setSettings((s: any) => ({ ...s, weekly_report_day: parseInt(e.target.value) }))}
                className="w-full bg-sentinel-bg border border-sentinel-border rounded px-3 py-2 text-sm text-sentinel-text focus:outline-none focus:border-sentinel-accent"
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
            <div className="flex-1">
              <label className="text-xs text-sentinel-subtext tracking-widest mb-2 block">TIME</label>
              <input
                type="time"
                value={settings.weekly_report_time}
                onChange={e => setSettings((s: any) => ({ ...s, weekly_report_time: e.target.value }))}
                className="w-full bg-sentinel-bg border border-sentinel-border rounded px-3 py-2 text-sm text-sentinel-text focus:outline-none focus:border-sentinel-accent"
              />
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}