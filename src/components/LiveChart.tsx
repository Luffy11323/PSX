'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

interface ChartProps {
  symbol: string
  buyLine: number | null
  sellLine: number | null
  allTimeHigh: number | null
  threeYearHigh: number | null
  onBuyLineChange: (price: number) => void
  onSellLineChange: (price: number) => void
  getToken: () => Promise<string | undefined>  // ← NEW
}

interface ChartBar {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export default function LiveChart({
  symbol,
  buyLine,
  sellLine,
  allTimeHigh,
  threeYearHigh,
  onBuyLineChange,
  onSellLineChange,
  getToken,
}: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const seriesRef = useRef<any>(null)
  const buyLineRef = useRef<any>(null)
  const sellLineRef = useRef<any>(null)
  const athLineRef = useRef<any>(null)
  const threeYrLineRef = useRef<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [period, setPeriod] = useState<'1y' | '2y' | '3y'>('1y')
  const priceUpdateRef = useRef<NodeJS.Timeout>()

  const authFetch = async (url: string) => {
    const token = await getToken()
    return fetch(url, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  }

  useEffect(() => {
    if (!chartContainerRef.current) return

    const initChart = async () => {
      const { createChart, ColorType, CrosshairMode, LineStyle } = await import('lightweight-charts')

      const chart = createChart(chartContainerRef.current!, {
        width: chartContainerRef.current!.clientWidth,
        height: 420,
        layout: {
          background: { type: ColorType.Solid, color: '#0f1629' },
          textColor: '#8899aa',
          fontFamily: 'Space Mono, monospace',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: '#1e2d4a', style: LineStyle.Dotted },
          horzLines: { color: '#1e2d4a', style: LineStyle.Dotted },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: { color: '#00d4ff44', style: LineStyle.Dashed, labelBackgroundColor: '#141d35' },
          horzLine: { color: '#00d4ff44', style: LineStyle.Dashed, labelBackgroundColor: '#141d35' },
        },
        rightPriceScale: { borderColor: '#1e2d4a', textColor: '#8899aa' },
        timeScale: { borderColor: '#1e2d4a', timeVisible: true, secondsVisible: false },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale: { mouseWheel: true, pinch: true },
      })

      const series = chart.addCandlestickSeries({
        upColor: '#00ff88',
        downColor: '#ff3d5a',
        borderUpColor: '#00ff88',
        borderDownColor: '#ff3d5a',
        wickUpColor: '#00ff8880',
        wickDownColor: '#ff3d5a80',
      })

      chartRef.current = chart
      seriesRef.current = series

      const resizeObserver = new ResizeObserver(() => {
        if (chartContainerRef.current) {
          chart.applyOptions({ width: chartContainerRef.current.clientWidth })
        }
      })
      resizeObserver.observe(chartContainerRef.current!)

      return () => {
        resizeObserver.disconnect()
        chart.remove()
      }
    }

    const cleanup = initChart()
    return () => { cleanup.then(fn => fn?.()) }
  }, [])

  useEffect(() => {
    if (!seriesRef.current) return
    loadData()
  }, [symbol, period])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/stocks/${symbol}/price?history=true&period=${period}`)
      const { quote, history } = await res.json()

      if (history?.length > 0 && seriesRef.current) {
        const bars: ChartBar[] = history
          .filter((b: any) => b.close > 0)
          .map((b: any) => ({
            time: b.time,
            open: b.open || b.close,
            high: b.high || b.close,
            low: b.low || b.close,
            close: b.close,
            volume: b.volume || 0,
          }))
          .sort((a: ChartBar, b: ChartBar) => a.time - b.time)

        seriesRef.current.setData(bars)
        chartRef.current?.timeScale().fitContent()
      }

      if (quote) {
        setCurrentPrice(quote.price)
        setPriceChange(quote.changePercent || 0)
      }
    } catch (err) {
      console.error('Chart load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!seriesRef.current) return
    const updateLines = async () => {
      const { LineStyle } = await import('lightweight-charts')
      if (buyLineRef.current) { try { seriesRef.current.removePriceLine(buyLineRef.current) } catch {} }
      if (sellLineRef.current) { try { seriesRef.current.removePriceLine(sellLineRef.current) } catch {} }
      if (buyLine) {
        buyLineRef.current = seriesRef.current.createPriceLine({
          price: buyLine, color: '#00ff88', lineWidth: 2,
          lineStyle: LineStyle.Dashed, axisLabelVisible: true,
          title: `BUY ▶ PKR ${buyLine.toFixed(2)}`,
        })
      }
      if (sellLine) {
        sellLineRef.current = seriesRef.current.createPriceLine({
          price: sellLine, color: '#ff3d5a', lineWidth: 2,
          lineStyle: LineStyle.Dashed, axisLabelVisible: true,
          title: `SELL ▶ PKR ${sellLine.toFixed(2)}`,
        })
      }
    }
    updateLines()
  }, [buyLine, sellLine])

  useEffect(() => {
    if (!seriesRef.current) return
    const updateATH = async () => {
      const { LineStyle } = await import('lightweight-charts')
      if (athLineRef.current) { try { seriesRef.current.removePriceLine(athLineRef.current) } catch {} }
      if (threeYrLineRef.current) { try { seriesRef.current.removePriceLine(threeYrLineRef.current) } catch {} }
      if (allTimeHigh) {
        athLineRef.current = seriesRef.current.createPriceLine({
          price: allTimeHigh, color: '#ffcc00', lineWidth: 1,
          lineStyle: LineStyle.Dotted, axisLabelVisible: true,
          title: `ATH ${allTimeHigh.toFixed(2)}`,
        })
      }
      if (threeYearHigh && threeYearHigh !== allTimeHigh) {
        threeYrLineRef.current = seriesRef.current.createPriceLine({
          price: threeYearHigh, color: '#ffcc0080', lineWidth: 1,
          lineStyle: LineStyle.Dotted, axisLabelVisible: true,
          title: `3YR HIGH ${threeYearHigh.toFixed(2)}`,
        })
      }
    }
    updateATH()
  }, [allTimeHigh, threeYearHigh])

  useEffect(() => {
    const updateLivePrice = async () => {
      try {
        const res = await authFetch(`/api/stocks/${symbol}/price`)
        const { quote } = await res.json()
        if (!quote || !seriesRef.current) return
        setCurrentPrice(quote.price)
        setPriceChange(quote.changePercent || 0)
        const now = Math.floor(Date.now() / 1000)
        seriesRef.current.update({
          time: now - (now % 86400),
          open: quote.open,
          high: quote.high,
          low: quote.low,
          close: quote.price,
        })
      } catch {}
    }
    priceUpdateRef.current = setInterval(updateLivePrice, 30000)
    return () => clearInterval(priceUpdateRef.current)
  }, [symbol])

  const handleSetBuyLine = () => {
    const input = prompt(`Set BUY alert line for ${symbol} (PKR):`, buyLine?.toString() || '')
    if (!input) return
    const price = parseFloat(input)
    if (isNaN(price) || price <= 0) { toast.error('Invalid price'); return }
    onBuyLineChange(price)
    toast.success(`Buy line set at PKR ${price.toFixed(2)}`)
  }

  const handleSetSellLine = () => {
    const input = prompt(`Set SELL alert line for ${symbol} (PKR):`, sellLine?.toString() || '')
    if (!input) return
    const price = parseFloat(input)
    if (isNaN(price) || price <= 0) { toast.error('Invalid price'); return }
    onSellLineChange(price)
    toast.success(`Sell line set at PKR ${price.toFixed(2)}`)
  }

  return (
    <div className="bg-sentinel-surface border border-sentinel-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-sentinel-border">
        <div className="flex items-center gap-4">
          <div>
            <div className="font-display text-2xl text-sentinel-text tracking-widest">{symbol}</div>
            {currentPrice && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xl font-bold text-sentinel-text">PKR {currentPrice.toFixed(2)}</span>
                <span className={`text-sm font-bold ${priceChange >= 0 ? 'text-sentinel-green' : 'text-sentinel-red'}`}>
                  {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-sentinel-green pulse-dot" />
            <span className="text-xs text-sentinel-subtext tracking-widest">LIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {(['1y', '2y', '3y'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs rounded tracking-widest uppercase transition-all ${period === p ? 'bg-sentinel-accent text-sentinel-bg font-bold' : 'bg-sentinel-card text-sentinel-subtext hover:text-sentinel-text border border-sentinel-border'}`}
              >{p}</button>
            ))}
          </div>
          <button
            onClick={handleSetBuyLine}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-sentinel-green text-sentinel-green hover:bg-sentinel-green hover:text-sentinel-bg transition-all tracking-widest"
          >
            ── BUY LINE {buyLine && <span className="opacity-70">PKR {buyLine}</span>}
          </button>
          <button
            onClick={handleSetSellLine}
            className="flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-sentinel-red text-sentinel-red hover:bg-sentinel-red hover:text-sentinel-bg transition-all tracking-widest"
          >
            ── SELL LINE {sellLine && <span className="opacity-70">PKR {sellLine}</span>}
          </button>
        </div>
      </div>

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-sentinel-surface">
            <div className="text-sentinel-subtext text-xs tracking-widest animate-pulse">LOADING CHART DATA...</div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full" />
      </div>

      <div className="flex items-center gap-6 px-5 py-3 border-t border-sentinel-border text-xs text-sentinel-subtext">
        {buyLine && <div className="flex items-center gap-2"><div className="w-6 h-0.5" style={{ borderTop: '2px dashed #00ff88' }} /><span>BUY: PKR {buyLine.toFixed(2)}</span></div>}
        {sellLine && <div className="flex items-center gap-2"><div className="w-6 h-0.5" style={{ borderTop: '2px dashed #ff3d5a' }} /><span>SELL: PKR {sellLine.toFixed(2)}</span></div>}
        {allTimeHigh && <div className="flex items-center gap-2"><div className="w-6 h-0.5" style={{ borderTop: '2px dotted #ffcc00' }} /><span>ATH: PKR {allTimeHigh.toFixed(2)}</span></div>}
      </div>
    </div>
  )
}