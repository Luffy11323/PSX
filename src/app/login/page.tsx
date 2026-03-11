'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'

const supabase = createClient()

// ── Chart constants outside component — stable, never re-computed ──
const CANDLES = [
  { o: 210, h: 225, l: 205, c: 220 },
  { o: 220, h: 235, l: 215, c: 228 },
  { o: 228, h: 232, l: 218, c: 222 },
  { o: 222, h: 240, l: 220, c: 238 },
  { o: 238, h: 245, l: 230, c: 232 },
  { o: 232, h: 238, l: 225, c: 235 },
  { o: 235, h: 255, l: 233, c: 252 }, // BUY signal
  { o: 252, h: 260, l: 248, c: 257 },
  { o: 257, h: 265, l: 250, c: 248 },
  { o: 248, h: 252, l: 238, c: 242 },
  { o: 242, h: 248, l: 236, c: 245 },
  { o: 245, h: 268, l: 243, c: 265 },
  { o: 265, h: 275, l: 260, c: 270 }, // ATH breakout
  { o: 270, h: 278, l: 265, c: 268 },
  { o: 268, h: 272, l: 258, c: 260 },
  { o: 260, h: 265, l: 252, c: 255 },
]

const SVG_W = 400
const SVG_H = 240
const PAD = { top: 20, right: 16, bottom: 28, left: 40 }
const CW = SVG_W - PAD.left - PAD.right
const CH = SVG_H - PAD.top - PAD.bottom

const allPrices = CANDLES.flatMap(c => [c.h, c.l])
const MIN_P = Math.min(...allPrices) - 6
const MAX_P = Math.max(...allPrices) + 6
const P_RANGE = MAX_P - MIN_P

const sy = (p: number) => PAD.top + CH - ((p - MIN_P) / P_RANGE) * CH
const CANDLE_W = (CW / CANDLES.length) * 0.52
const cx = (i: number) => PAD.left + (i + 0.5) * (CW / CANDLES.length)

const LINE_PTS = CANDLES.map((c, i) => `${cx(i)},${sy(c.c)}`).join(' ')
const AREA_PTS = `${LINE_PTS} ${cx(CANDLES.length - 1)},${PAD.top + CH} ${cx(0)},${PAD.top + CH}`
const GRID_PRICES = [210, 230, 250, 270]

const LOGIN_STYLES = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .login-root {
    min-height: 100vh;
    width: 100vw;
    display: flex;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
    color: #e0e7ff;
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
    padding: 48px 52px;
    position: relative;
    z-index: 1;
  }

  /* CHART WIDGET */
  .chart-widget {
    width: 100%;
    max-width: 440px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .chart-top-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .chart-symbol {
    font-family: 'DM Mono', 'Courier New', monospace;
    font-size: 20px;
    font-weight: 600;
    color: #e0e7ff;
    letter-spacing: 1px;
  }

  .chart-company {
    font-size: 11px;
    color: #94a3b8;
    margin-top: 3px;
  }

  .chart-price-col { text-align: right; }

  .chart-price {
    font-family: 'DM Mono', 'Courier New', monospace;
    font-size: 24px;
    font-weight: 600;
    color: #34d399;
    letter-spacing: -0.5px;
  }

  .chart-change {
    font-size: 11px;
    color: #34d399;
    margin-top: 3px;
  }

  .chart-badge-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .live-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    background: rgba(52,211,153,0.12);
    border: 1px solid rgba(52,211,153,0.28);
    border-radius: 20px;
    padding: 3px 10px;
    font-size: 10px;
    font-weight: 700;
    color: #34d399;
    letter-spacing: 1px;
  }

  .live-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #34d399;
    box-shadow: 0 0 6px #34d399;
  }

  .chart-meta { font-size: 10px; color: #475569; }

  .chart-card {
    background: rgba(15,23,42,0.7);
    border: 1px solid rgba(99,102,241,0.2);
    border-radius: 16px;
    padding: 12px 10px 8px;
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04);
    overflow: hidden;
  }

  .chart-stats-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .stat-box {
    background: rgba(30,41,59,0.7);
    border: 1px solid rgba(99,102,241,0.15);
    border-radius: 10px;
    padding: 9px 12px;
    text-align: center;
  }

  .stat-box-label {
    font-size: 9px;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 4px;
  }

  .stat-box-value {
    font-family: 'DM Mono', 'Courier New', monospace;
    font-size: 13px;
    font-weight: 600;
    color: #e0e7ff;
  }

  .brand-footer { margin-top: 24px; text-align: center; }
  .brand-name-text { font-size: 14px; font-weight: 700; color: #e0e7ff; }
  .brand-tagline { font-size: 11px; color: #475569; margin-top: 3px; }

  /* DIVIDER */
  .login-divider {
    width: 1px;
    align-self: stretch;
    margin: 48px 0;
    flex-shrink: 0;
    z-index: 1;
    background: linear-gradient(to bottom, transparent, rgba(99,102,241,0.4) 30%, rgba(99,102,241,0.4) 70%, transparent);
  }

  /* RIGHT PANEL */
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
    padding: 40px 36px;
    background: rgba(15,23,42,0.8);
    backdrop-filter: blur(24px);
    border: 1px solid rgba(99,102,241,0.3);
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    animation: card-in 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s both;
  }

  @keyframes card-in {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(34,197,94,0.1);
    border: 1px solid rgba(34,197,94,0.25);
    border-radius: 999px;
    padding: 5px 12px;
    margin-bottom: 28px;
  }

  .status-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #22c55e;
    animation: pulse-dot 2.5s infinite;
    box-shadow: 0 0 10px rgba(34,197,94,0.5);
  }

  @keyframes pulse-dot {
    0%,100% { opacity:1; transform:scale(1); }
    50% { opacity:0.5; transform:scale(1.3); }
  }

  .status-text { font-size: 11px; font-weight: 700; color: #86efac; letter-spacing: 0.5px; }

  .form-heading { margin-bottom: 28px; }
  .form-heading h2 { font-size: 24px; font-weight: 700; color: #e0e7ff; letter-spacing: -0.4px; margin-bottom: 6px; }
  .form-heading p { font-size: 13px; color: #64748b; }

  .field-group { margin-bottom: 20px; position: relative; }

  .field-label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    margin-bottom: 8px;
    letter-spacing: 0.3px;
    transition: color 0.2s;
  }
  .field-label.focused { color: #a78bfa; }

  .field-wrap { position: relative; }

  .field-icon {
    position: absolute;
    left: 14px; top: 50%;
    transform: translateY(-50%);
    font-size: 15px;
    color: #475569;
    pointer-events: none;
    transition: color 0.2s;
  }
  .field-icon.focused { color: #a78bfa; }

  .field-input {
    width: 100%;
    height: 48px;
    background: rgba(15,23,42,0.6);
    border: 1.5px solid rgba(99,102,241,0.3);
    border-radius: 12px;
    padding: 0 14px 0 44px;
    font-size: 14px;
    color: #e0e7ff;
    outline: none;
    transition: all 0.2s;
    font-family: inherit;
  }
  .field-input::placeholder { color: #334155; }
  .field-input:focus {
    border-color: #a78bfa;
    box-shadow: 0 0 0 3px rgba(167,139,250,0.12);
    background: rgba(30,41,59,0.8);
  }

  .field-underline {
    height: 2px;
    background: linear-gradient(to right, #6366f1, #a78bfa);
    border-radius: 1px;
    margin-top: 4px;
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.35s ease;
  }
  .field-underline.active { transform: scaleX(1); }

  .submit-btn {
    width: 100%;
    height: 50px;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    margin-top: 8px;
    transition: all 0.25s ease;
    box-shadow: 0 4px 20px rgba(99,102,241,0.35);
    font-family: inherit;
  }
  .submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(99,102,241,0.45); }
  .submit-btn:active { transform: translateY(0); }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .btn-spinner {
    display: inline-block;
    width: 15px; height: 15px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 8px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .form-footer {
    margin-top: 24px;
    text-align: center;
    font-size: 11px;
    color: #334155;
  }

  @media (max-width: 900px) {
    .login-left, .login-divider { display: none; }
    .login-right { width: 100%; }
  }
`

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passwordFocused, setPasswordFocused] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<SVGSVGElement>(null)
  const widgetRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Background particle canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let animId: number
    let W = (canvas.width = window.innerWidth)
    let H = (canvas.height = window.innerHeight)
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight }
    window.addEventListener('resize', resize)
    const pts = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: Math.random() * 1.6 + 0.4, a: Math.random() * 0.4 + 0.08,
    }))
    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${p.a})`; ctx.fill()
      })
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 110) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y)
            ctx.strokeStyle = `rgba(99,102,241,${0.07 * (1 - d / 110)})`
            ctx.lineWidth = 0.7; ctx.stroke()
          }
        }
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  // GSAP chart animation
  useGSAP(() => {
    if (!chartRef.current || !widgetRef.current) return
    const tl = gsap.timeline({ delay: 0.3, defaults: { ease: 'power3.out' } })

    // 1. Whole widget slides up
    tl.from(widgetRef.current, { opacity: 0, y: 44, duration: 0.9 })

    // 2. Symbol + price header
    tl.from('.chart-top-row > *', { opacity: 0, y: 14, stagger: 0.12, duration: 0.5 }, '-=0.5')

    // 3. Badge row
    tl.from('.chart-badge-row > *', { opacity: 0, x: -10, stagger: 0.1, duration: 0.4 }, '-=0.3')

    // 4. Chart card
    tl.from('.chart-card', { opacity: 0, scale: 0.97, duration: 0.5 }, '-=0.25')

    // 5. Grid lines scaleX from left
    tl.from('.chart-grid line', {
      scaleX: 0, transformOrigin: 'left center',
      opacity: 0, duration: 0.5, stagger: 0.07,
    }, '-=0.2')
    tl.from('.chart-ylabel', { opacity: 0, x: -6, duration: 0.3, stagger: 0.06 }, '-=0.4')

    // 6. Candle bodies grow from bottom axis upward
    tl.from('.candle-body', {
      scaleY: 0, transformOrigin: 'bottom center',
      duration: 0.4, stagger: 0.04, ease: 'back.out(1.5)',
    }, '-=0.1')

    // 7. Wicks scale from center
    tl.from('.candle-wick', {
      scaleY: 0, transformOrigin: 'center center',
      duration: 0.25, stagger: 0.04,
    }, '-=0.5')

    // 8. Price line draws itself via strokeDashoffset
    const poly = chartRef.current.querySelector('.price-line') as SVGPolylineElement | null
    if (poly) {
      const len = 900 // approximation for a polyline
      gsap.set(poly, { strokeDasharray: len, strokeDashoffset: len })
      tl.to(poly, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }, '-=0.25')
    }

    // 9. Area fill fades in
    tl.from('.chart-area', { opacity: 0, duration: 0.5 }, '-=0.5')

    // 10. Signal markers pop in with bounce
    tl.from('.signal-marker', {
      scale: 0, opacity: 0, transformOrigin: 'center center',
      duration: 0.45, stagger: 0.2, ease: 'back.out(2.5)',
    }, '-=0.35')

    // 11. Price label + buy line slide in from right
    tl.from('.price-label-group', { opacity: 0, x: 8, duration: 0.35, stagger: 0.12 }, '-=0.2')

    // 12. Stat boxes stagger up
    tl.from('.stat-box', { opacity: 0, y: 10, stagger: 0.1, duration: 0.4 }, '-=0.2')

    // 13. Brand footer
    tl.from('.brand-footer', { opacity: 0, y: 6, duration: 0.35 }, '-=0.15')

    // ── Idle loops ──
    // Live badge breathes
    gsap.to('.live-badge', {
      opacity: 0.45, duration: 1.1, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2.5,
    })

    // Widget gently floats up/down
    gsap.to(widgetRef.current, {
      y: '-=8', duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 3,
    })

    // BUY pulse ring expands and fades
    gsap.to('.buy-pulse', {
      scale: 2.2, opacity: 0, duration: 1.4,
      repeat: -1, ease: 'power1.out',
      transformOrigin: 'center center', delay: 3.5,
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { toast.error(error.message); return }
      toast.success('Login successful!')
      router.refresh()
      window.location.href = '/dashboard'
    } catch {
      toast.error('Login failed unexpectedly')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: LOGIN_STYLES }} />
      <canvas ref={canvasRef} className="login-canvas" />

      <div className="login-root">

        {/* LEFT: Animated chart panel */}
        <div className="login-left">
          <div className="chart-widget" ref={widgetRef}>

            <div className="chart-top-row">
              <div>
                <div className="chart-symbol">LUCK</div>
                <div className="chart-company">Lucky Cement Ltd · PSX</div>
              </div>
              <div className="chart-price-col">
                <div className="chart-price">268.50</div>
                <div className="chart-change">▲ +4.20%</div>
              </div>
            </div>

            <div className="chart-badge-row">
              <span className="live-badge">
                <span className="live-dot" />
                LIVE
              </span>
              <span className="chart-meta">PKR · 1D · Auto-refresh 60s</span>
            </div>

            <div className="chart-card">
              <svg
                ref={chartRef}
                width="100%"
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ display: 'block' }}
              >
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid */}
                <g className="chart-grid">
                  {GRID_PRICES.map((p, i) => (
                    <g key={i}>
                      <line
                        x1={PAD.left} y1={sy(p)}
                        x2={SVG_W - PAD.right} y2={sy(p)}
                        stroke="rgba(148,163,184,0.1)"
                        strokeWidth="1" strokeDasharray="4 5"
                      />
                      <text
                        className="chart-ylabel"
                        x={PAD.left - 5} y={sy(p) + 4}
                        textAnchor="end" fontSize="8.5"
                        fill="#475569" fontFamily="DM Mono, monospace"
                      >{p}</text>
                    </g>
                  ))}
                  <line
                    x1={PAD.left} y1={PAD.top + CH}
                    x2={SVG_W - PAD.right} y2={PAD.top + CH}
                    stroke="rgba(148,163,184,0.15)" strokeWidth="1"
                  />
                </g>

                {/* Area fill under price line */}
                <polygon className="chart-area" points={AREA_PTS} fill="url(#areaGrad)" />

                {/* Candlesticks */}
                {CANDLES.map((c, i) => {
                  const x = cx(i)
                  const green = c.c >= c.o
                  const col = green ? '#34d399' : '#f87171'
                  const bTop = sy(Math.max(c.o, c.c))
                  const bBot = sy(Math.min(c.o, c.c))
                  const bH = Math.max(bBot - bTop, 2)
                  return (
                    <g key={i}>
                      <line
                        className="candle-wick"
                        x1={x} y1={sy(c.h)} x2={x} y2={sy(c.l)}
                        stroke={col} strokeWidth="1.5" opacity="0.65"
                      />
                      <rect
                        className="candle-body"
                        x={x - CANDLE_W / 2} y={bTop}
                        width={CANDLE_W} height={bH}
                        fill={col} opacity="0.9" rx="1.5"
                      />
                    </g>
                  )
                })}

                {/* Price line draws itself */}
                <polyline
                  className="price-line"
                  points={LINE_PTS}
                  fill="none"
                  stroke="#a78bfa"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity="0.85"
                />

                {/* BUY signal — index 6 */}
                <g className="signal-marker">
                  <circle
                    className="buy-pulse"
                    cx={cx(6)} cy={sy(CANDLES[6].l) + 15}
                    r="7" fill="#34d399" opacity="0.4"
                  />
                  <circle cx={cx(6)} cy={sy(CANDLES[6].l) + 15} r="4" fill="#34d399" />
                  <text
                    x={cx(6)} y={sy(CANDLES[6].l) + 27}
                    textAnchor="middle" fontSize="7.5"
                    fill="#34d399" fontFamily="DM Mono, monospace" fontWeight="700"
                  >BUY</text>
                </g>

                {/* ATH breakout — index 12 */}
                <g className="signal-marker">
                  <circle cx={cx(12)} cy={sy(CANDLES[12].h) - 12} r="4" fill="#fbbf24" />
                  <text
                    x={cx(12)} y={sy(CANDLES[12].h) - 20}
                    textAnchor="middle" fontSize="7.5"
                    fill="#fbbf24" fontFamily="DM Mono, monospace" fontWeight="700"
                  >ATH</text>
                </g>

                {/* Current price tag */}
                <g className="price-label-group">
                  <rect
                    x={SVG_W - PAD.right - 48}
                    y={sy(CANDLES[CANDLES.length - 1].c) - 9}
                    width={48} height={16}
                    fill="#a78bfa" rx="4" opacity="0.92"
                  />
                  <text
                    x={SVG_W - PAD.right - 24}
                    y={sy(CANDLES[CANDLES.length - 1].c) + 3}
                    textAnchor="middle" fontSize="8.5"
                    fill="white" fontFamily="DM Mono, monospace" fontWeight="700"
                  >268.50</text>
                </g>

                {/* Buy line */}
                <g className="price-label-group">
                  <line
                    x1={PAD.left} y1={sy(252)}
                    x2={SVG_W - PAD.right} y2={sy(252)}
                    stroke="#34d399" strokeWidth="1"
                    strokeDasharray="5 4" opacity="0.45"
                  />
                  <text
                    x={PAD.left + 4} y={sy(252) - 3}
                    fontSize="7.5" fill="#34d399"
                    fontFamily="DM Mono, monospace" fontWeight="600" opacity="0.75"
                  >BUY LINE  252</text>
                </g>
              </svg>
            </div>

            {/* Stats */}
            <div className="chart-stats-row">
              <div className="stat-box">
                <div className="stat-box-label">Signal</div>
                <div className="stat-box-value" style={{ color: '#34d399' }}>3/3 ●●●</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">ATH</div>
                <div className="stat-box-value" style={{ color: '#fbbf24' }}>275.00</div>
              </div>
              <div className="stat-box">
                <div className="stat-box-label">3yr High</div>
                <div className="stat-box-value">248.00</div>
              </div>
            </div>

            <div className="brand-footer">
              <div className="brand-name-text">📡 Sentinel</div>
              <div className="brand-tagline">PSX Intelligence System</div>
            </div>

          </div>
        </div>

        <div className="login-divider" />

        {/* RIGHT: Login form */}
        <div className="login-right">
          <div className="form-card">
            <div className="status-badge">
              <div className="status-dot" />
              <span className="status-text">SYSTEM ONLINE</span>
            </div>

            <div className="form-heading">
              <h2>Sign in to Sentinel</h2>
              <p>Enter your credentials to access the dashboard</p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="field-group">
                <label className={`field-label${emailFocused ? ' focused' : ''}`}>Email address</label>
                <div className="field-wrap">
                  <span className={`field-icon${emailFocused ? ' focused' : ''}`}>✉</span>
                  <input
                    type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    required className="field-input" placeholder="you@company.com"
                  />
                </div>
                <div className={`field-underline${emailFocused ? ' active' : ''}`} />
              </div>

              <div className="field-group">
                <label className={`field-label${passwordFocused ? ' focused' : ''}`}>Password</label>
                <div className="field-wrap">
                  <span className={`field-icon${passwordFocused ? ' focused' : ''}`}>🔒</span>
                  <input
                    type="password" value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required className="field-input" placeholder="••••••••••"
                  />
                </div>
                <div className={`field-underline${passwordFocused ? ' active' : ''}`} />
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading && <span className="btn-spinner" />}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="form-footer">Sentinel v1.0 · Restricted Access</div>
          </div>
        </div>

      </div>
    </>
  )
}