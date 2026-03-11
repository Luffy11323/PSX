'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

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

  // Refs for GSAP animation targets
  const leftPanelRef = useRef<HTMLDivElement>(null)
  const brandRef = useRef<HTMLDivElement>(null)
  const welcomeRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Particle canvas animation (unchanged)
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
        ctx.fillStyle = `rgba(124, 58, 237, ${p.alpha})`  // violet tint for theme
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
            ctx.strokeStyle = `rgba(124, 58, 237, ${0.08 * (1 - dist / 120)})`
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

  // GSAP animations for left panel - runs once on mount
  useGSAP(() => {
    if (!leftPanelRef.current) return

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    // Panel slide-in from left
    tl.from(leftPanelRef.current, {
      opacity: 0,
      x: -80,
      duration: 1.4,
    })

    // Brand mark reveal + scale
    if (brandRef.current) {
      tl.from(brandRef.current, {
        opacity: 0,
        y: 50,
        scale: 0.9,
        duration: 1.1,
      }, '-=1.0')
    }

    // Welcome block - stagger title and desc
    if (welcomeRef.current) {
      tl.from(welcomeRef.current.querySelectorAll('div, p'), {
        opacity: 0,
        y: 35,
        stagger: 0.18,
        duration: 1,
      }, '-=0.8')
    }

    // Features - stagger cards with slight rotation & scale
    if (featuresRef.current) {
      tl.from(featuresRef.current.children, {
        opacity: 0,
        y: 60,
        scale: 0.92,
        rotation: -4,
        stagger: 0.22,
        duration: 1.2,
      }, '-=0.7')
    }

    // Continuous gentle breathing on brand logo
    if (brandRef.current) {
      gsap.to(brandRef.current.querySelector('.brand-logo'), {
        scale: 1.08,
        duration: 5,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      })
    }
  }, []) // empty deps = run once

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
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          color: #e0e7ff;
          position: relative;
          overflow: hidden;
        }

        .login-canvas {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }

        /* LEFT PANEL - now dynamic control center */
        .login-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 48px;
          position: relative;
          z-index: 1;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(16px);
          border-right: 1px solid rgba(124, 58, 237, 0.18);
        }

        .brand-mark {
          text-align: center;
          margin-bottom: 48px;
        }

        .brand-logo {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          background: linear-gradient(135deg, #7c3aed, #c084fc, #a78bfa);
          background-size: 300% 300%;
          animation: gradient-flow 10s ease infinite;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 10px 30px rgba(124, 58, 237, 0.4);
          font-size: 28px;
        }

        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .brand-title {
          font-size: 32px;
          font-weight: 700;
          background: linear-gradient(90deg, #c084fc, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.8px;
        }

        .brand-sub {
          font-size: 14px;
          color: #a5b4fc;
          letter-spacing: 0.4px;
        }

        .welcome-block {
          text-align: center;
          max-width: 360px;
        }

        .welcome-title {
          font-size: 42px;
          font-weight: 700;
          letter-spacing: -1.2px;
          line-height: 1.05;
          margin-bottom: 12px;
        }

        .welcome-title span {
          background: linear-gradient(135deg, #c084fc, #a78bfa, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .welcome-desc {
          font-size: 15px;
          color: #cbd5e1;
          line-height: 1.6;
        }

        /* FEATURES */
        .features {
          margin-top: 52px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          width: 100%;
          max-width: 340px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 16px 20px;
          background: rgba(30, 41, 59, 0.7);
          border: 1px solid rgba(124, 58, 237, 0.3);
          border-radius: 16px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .feature-item:hover {
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 12px 40px rgba(124, 58, 237, 0.35);
          border-color: #a78bfa;
        }

        .feature-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          background: linear-gradient(135deg, #6d28d9, #a855f7);
          color: white;
          box-shadow: 0 0 20px rgba(168, 85, 250, 0.5);
          transition: all 0.4s;
        }

        .feature-item:hover .feature-icon {
          transform: scale(1.15) rotate(8deg);
        }

        .feature-text-title { font-size: 14px; font-weight: 600; color: #e0e7ff; }
        .feature-text-desc { font-size: 12px; color: #a5b4fc; margin-top: 2px; }

        /* DIVIDER */
        .login-divider {
          width: 2px;
          background: linear-gradient(to bottom, transparent 0%, #a78bfa 30%, #7c3aed 70%, transparent 100%);
          background-size: 100% 300%;
          animation: flow-gradient 12s linear infinite;
          align-self: stretch;
          margin: 40px 0;
          flex-shrink: 0;
          z-index: 1;
        }

        @keyframes flow-gradient {
          0% { background-position: 0 0%; }
          100% { background-position: 0 200%; }
        }

        /* RIGHT PANEL - FORM */
        .login-right {
          width: 480px;
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
          padding: 40px 36px;
          background: rgba(30, 41, 59, 0.75);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(124, 58, 237, 0.35);
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          opacity: 0;
          transform: translateX(24px);
          animation: fade-left 0.8s ease 0.2s forwards;
        }

        @keyframes fade-left {
          to { opacity: 1; transform: translateX(0); }
        }

        .form-heading h2 {
          font-size: 26px;
          font-weight: 700;
          color: #e0e7ff;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }

        .form-heading p {
          font-size: 14px;
          color: #a5b4fc;
        }

        .field-group {
          margin-bottom: 24px;
          position: relative;
        }

        .field-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 8px;
          letter-spacing: 0.3px;
          transition: color 0.2s;
        }

        .field-label.focused { color: #a78bfa; }

        .field-wrap { position: relative; }

        .field-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
          color: #94a3b8;
          transition: color 0.2s;
          pointer-events: none;
        }

        .field-icon.focused { color: #a78bfa; }

        .field-input {
          width: 100%;
          height: 52px;
          background: rgba(15, 23, 42, 0.6);
          border: 1.5px solid rgba(124, 58, 237, 0.4);
          border-radius: 14px;
          padding: 0 16px 0 48px;
          font-size: 15px;
          color: #e0e7ff;
          outline: none;
          transition: all 0.2s;
        }

        .field-input::placeholder { color: #94a3b8; }

        .field-input:focus {
          border-color: #a78bfa;
          box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.15);
          background: rgba(30, 41, 59, 0.8);
        }

        .field-underline {
          height: 2px;
          background: linear-gradient(to right, #7c3aed, #c084fc);
          border-radius: 1px;
          margin-top: 4px;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s ease;
        }

        .field-underline.active { transform: scaleX(1); }

        .submit-btn {
          width: 100%;
          height: 54px;
          background: linear-gradient(135deg, #7c3aed 0%, #c084fc 100%);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 12px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          box-shadow: 0 6px 24px rgba(124, 58, 237, 0.4);
        }

        .submit-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(192, 132, 252, 0.5);
        }

        .submit-btn:active { transform: translateY(0); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

        .btn-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 3px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          vertical-align: middle;
          margin-right: 10px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .form-footer {
          margin-top: 32px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 999px;
          padding: 6px 14px;
          margin-bottom: 32px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          animation: pulse-dot 2.5s infinite;
          box-shadow: 0 0 12px #22c55e80;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }

        .status-text { font-size: 12px; font-weight: 600; color: #86efac; }

        @media (max-width: 900px) {
          .login-left { display: none; }
          .login-divider { display: none; }
          .login-right { width: 100%; padding: 32px 24px; }
        }
      `}</style>

      <canvas ref={canvasRef} className="login-canvas" />

      <div className="login-root">
        {/* LEFT - GSAP animated */}
        <div className="login-left" ref={leftPanelRef}>
          <div className="brand-mark" ref={brandRef}>
            <div className="brand-logo">📡</div>
            <div className="brand-title">Sentinel</div>
            <div className="brand-sub">PSX Intelligence System</div>
          </div>

          <div className="welcome-block" ref={welcomeRef}>
            <div className="welcome-title">
              Welcome<br />back to <span>Sentinel</span>
            </div>
            <p className="welcome-desc">
              Your intelligent PSX market monitor. Real-time signals, multi-layer analysis, and instant alerts — all in one place.
            </p>
          </div>

          <div className="features" ref={featuresRef}>
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