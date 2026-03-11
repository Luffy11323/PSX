'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const supabase = createClient() // ← OUTSIDE component, initialized once

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Login successful!')
      router.refresh()                          // ← refresh middleware session first
      window.location.href = '/dashboard'       // ← hard redirect, not router.push
    } catch (err) {
      console.error('Unexpected error:', err)
      toast.error('Login failed unexpectedly')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-sentinel-bg flex items-center justify-center p-4 scanline">
      <div className="fixed inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <div className="font-display text-6xl text-sentinel-accent tracking-widest mb-2">
            SENTINEL
          </div>
          <div className="text-sentinel-subtext text-xs tracking-[6px] uppercase">
            PSX Intelligence System
          </div>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full bg-sentinel-green pulse-dot" />
            <span className="text-sentinel-green text-xs tracking-widest">SYSTEM ONLINE</span>
          </div>
        </div>

        <div className="bg-sentinel-card border border-sentinel-border rounded-lg p-8"
          style={{ boxShadow: '0 0 40px rgba(0, 212, 255, 0.05)' }}>

          <div className="text-xs text-sentinel-subtext tracking-[4px] uppercase mb-6">
            SECURE ACCESS
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs text-sentinel-subtext tracking-widest uppercase mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-sentinel-surface border border-sentinel-border rounded px-4 py-3 text-sentinel-text text-sm focus:outline-none focus:border-sentinel-accent transition-colors"
                placeholder="admin@company.com"
              />
            </div>

            <div>
              <label className="block text-xs text-sentinel-subtext tracking-widest uppercase mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-sentinel-surface border border-sentinel-border rounded px-4 py-3 text-sentinel-text text-sm focus:outline-none focus:border-sentinel-accent transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sentinel-accent text-sentinel-bg font-bold py-3 rounded tracking-widest text-sm uppercase hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {loading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 text-xs text-sentinel-muted tracking-widest">
          PSX SENTINEL v1.0 • RESTRICTED ACCESS
        </div>
      </div>
    </div>
  )
}