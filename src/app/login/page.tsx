'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const supabase = createClient()

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [mounted, setMounted] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Particle canvas animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let W = canvas.width = window.innerWidth
    let H = canvas.height = window.innerHeight

    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    const particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number }[] = []
    for (let i = 0; i < 55; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.8 + 0.4,
        alpha: Math.random() * 0.5 + 0.1,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99, 102, 241, ${p.alpha})`
        ctx.fill()
      })

      // Draw soft connection lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 * (1 - dist / 120)})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

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
      router.refresh()
      window.location.href = '/dashboard'
    } catch (err) {
      console.error('Unexpected error:', err)
      toast.error('Login failed unexpectedly')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700&family=DM+Mono:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          font-family: 'Bricolage Grotesque', sans-serif;
          background: #faf9f7;
          position: relative;
          overflow: hidden;
        }

        .login-canvas {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }

        /* LEFT PANEL */
        .login-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 48px;
          position: relative;
          z-index: 1;
        }

        .brand-mark {
          opacity: 0;
          transform: translateY(24px);
          animation: fade-up 0.7s ease 0.1s forwards;
          text-align: center;
          margin-bottom: 48px;
        }

        @keyframes fade-up {
          to { opacity: 1; transform: translateY(0); }
        }

        .brand-logo {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 8px 24px rgba(99,102,241,0.25);
          font-size: 24px;
        }

        .brand-title {
          font-size: 28px;
          font-weight: 700;
          color: #1a1917;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
        }

        .brand-sub {
          font-size: 13px;
          color: #9e9c97;
          letter-spacing: 0.2px;
        }

        .welcome-block {
          opacity: 0;
          transform: translateY(24px);
          animation: fade-up 0.7s ease 0.25s forwards;
          text-align: center;
          max-width: 340px;
        }

        .welcome-title {
          font-size: 36px;
          font-weight: 700;
          color: #1a1917;
          letter-spacing: -1px;
          line-height: 1.1;
          margin-bottom: 10px;
        }

        .welcome-title span {
          background: linear-gradient(135deg, #6366f1, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .welcome-desc {
          font-size: 14px;
          color: #7c7a75;
          line-height: 1.6;
        }

        /* FEATURES */
        .features {
          margin-top: 44px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 320px;
          opacity: 0;
          animation: fade-up 0.7s ease 0.4s forwards;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border: 1px solid #ece9e3;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .feature-item:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .feature-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          flex-shrink: 0;
        }

        .feature-icon.purple { background: #f0f0ff; }
        .feature-icon.green { background: #f0fdf4; }
        .feature-icon.amber { background: #fffbeb; }

        .feature-text-title { font-size: 13px; font-weight: 600; color: #1a1917; }
        .feature-text-desc { font-size: 11px; color: #9e9c97; margin-top: 1px; }

        /* DIVIDER */
        .login-divider {
          width: 1px;
          background: linear-gradient(to bottom, transparent, #e5e2db, transparent);
          align-self: stretch;
          margin: 40px 0;
          flex-shrink: 0;
          z-index: 1;
        }

        /* RIGHT PANEL - FORM */
        .login-right {
          width: 460px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 52px;
          position: relative;
          z-index: 1;
        }

        .form-card {
          width: 100%;
          opacity: 0;
          transform: translateX(24px);
          animation: fade-left 0.7s ease 0.2s forwards;
        }

        @keyframes fade-left {
          to { opacity: 1; transform: translateX(0); }
        }

        .form-heading {
          margin-bottom: 32px;
        }

        .form-heading h2 {
          font-size: 24px;
          font-weight: 700;
          color: #1a1917;
          letter-spacing: -0.4px;
          margin-bottom: 4px;
        }

        .form-heading p {
          font-size: 13px;
          color: #9e9c97;
        }

        .field-group {
          margin-bottom: 20px;
          position: relative;
        }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #6b6860;
          margin-bottom: 7px;
          letter-spacing: 0.2px;
          transition: color 0.2s;
        }

        .field-label.focused { color: #6366f1; }

        .field-wrap {
          position: relative;
        }

        .field-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 15px;
          color: #c4c1ba;
          transition: color 0.2s;
          pointer-events: none;
        }

        .field-icon.focused { color: #6366f1; }

        .field-input {
          width: 100%;
          height: 48px;
          background: white;
          border: 1.5px solid #e5e2db;
          border-radius: 12px;
          padding: 0 16px 0 42px;
          font-size: 14px;
          font-family: 'Bricolage Grotesque', sans-serif;
          color: #1a1917;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .field-input::placeholder { color: #c4c1ba; }

        .field-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99,102,241,0.1);
        }

        .field-underline {
          height: 2px;
          background: linear-gradient(to right, #6366f1, #a78bfa);
          border-radius: 1px;
          margin-top: 3px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        .field-underline.active { transform: scaleX(1); }

        .submit-btn {
          width: 100%;
          height: 50px;
          background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Bricolage Grotesque', sans-serif;
          cursor: pointer;
          margin-top: 8px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          letter-spacing: 0.2px;
          box-shadow: 0 4px 16px rgba(99,102,241,0.3);
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .submit-btn:hover::before { opacity: 1; }
        .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.35); }
        .submit-btn:active { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .submit-btn span { position: relative; z-index: 1; }

        .btn-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .form-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 11px;
          color: #c4c1ba;
          letter-spacing: 0.2px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 20px;
          padding: 4px 12px;
          margin-bottom: 28px;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #16a34a;
          animation: pulse-dot 2s infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .status-text { font-size: 11px; font-weight: 600; color: #16a34a; }

        @media (max-width: 900px) {
          .login-left { display: none; }
          .login-divider { display: none; }
          .login-right { width: 100%; padding: 32px 24px; }
        }
      `}</style>

      <canvas ref={canvasRef} className="login-canvas" />

      <div className="login-root">
        {/* LEFT */}
        <div className="login-left">
          <div className="brand-mark">
            <div className="brand-logo">📡</div>
            <div className="brand-title">Sentinel</div>
            <div className="brand-sub">PSX Intelligence System</div>
          </div>

          <div className="welcome-block">
            <div className="welcome-title">
              Welcome<br />back to <span>Sentinel</span>
            </div>
            <p className="welcome-desc">
              Your intelligent PSX market monitor. Real-time signals, multi-layer analysis, and instant alerts — all in one place.
            </p>
          </div>

          <div className="features">
            <div className="feature-item">
              <div className="feature-icon purple">🧠</div>
              <div>
                <div className="feature-text-title">3-Layer Signal Analysis</div>
                <div className="feature-text-desc">Technical, momentum & trend consensus</div>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon green">📈</div>
              <div>
                <div className="feature-text-title">Live Chart Monitoring</div>
                <div className="feature-text-desc">Real-time price with buy/sell overlays</div>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon amber">🔔</div>
              <div>
                <div className="feature-text-title">Instant Alerts</div>
                <div className="feature-text-desc">Email notifications on breakouts</div>
              </div>
            </div>
          </div>
        </div>

        <div className="login-divider" />

        {/* RIGHT — FORM */}
        <div className="login-right">
          <div className="form-card">
            <div className="status-badge">
              <div className="status-dot" />
              <span className="status-text">System Online</span>
            </div>

            <div className="form-heading">
              <h2>Sign in to your account</h2>
              <p>Enter your credentials to access the dashboard</p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="field-group">
                <label className={`field-label${emailFocused ? ' focused' : ''}`}>Email address</label>
                <div className="field-wrap">
                  <span className={`field-icon${emailFocused ? ' focused' : ''}`}>✉</span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    required
                    className="field-input"
                    placeholder="you@company.com"
                  />
                </div>
                <div className={`field-underline${emailFocused ? ' active' : ''}`} />
              </div>

              <div className="field-group">
                <label className={`field-label${passwordFocused ? ' focused' : ''}`}>Password</label>
                <div className="field-wrap">
                  <span className={`field-icon${passwordFocused ? ' focused' : ''}`}>🔒</span>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    className="field-input"
                    placeholder="••••••••••"
                  />
                </div>
                <div className={`field-underline${passwordFocused ? ' active' : ''}`} />
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                <span>
                  {loading && <span className="btn-spinner" />}
                  {loading ? 'Signing in…' : 'Sign in'}
                </span>
              </button>
            </form>

            <div className="form-footer">
              Sentinel v1.0 · Restricted Access
            </div>
          </div>
        </div>
      </div>
    </>
  )
}