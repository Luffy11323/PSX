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
  getToken: () => Promise<string | undefined>
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
        height: 460,
        layout: {
          background: { type: ColorType.Solid, color: '#fafaf8' },
          textColor: '#1a1916',          // Controls time scale + general text
          fontFamily: "'Bricolage Grotesque', 'DM Mono', monospace",
          fontSize: 12,
        },
        grid: {
          vertLines: { color: '#e8e6e0', style: LineStyle.Dotted },
          horzLines: { color: '#e8e6e0', style: LineStyle.Dotted },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
          vertLine: {
            color: 'rgba(37, 99, 235, 0.4)',
            style: LineStyle.Dashed,
            labelBackgroundColor: '#eff4ff',
          },
          horzLine: {
            color: 'rgba(37, 99, 235, 0.4)',
            style: LineStyle.Dashed,
            labelBackgroundColor: '#eff4ff',
          },
        },
        rightPriceScale: {
          borderColor: '#e8e6e0',
          textColor: '#6b6860',
          scaleMargins: { top: 0.08, bottom: 0.12 },
        },
        timeScale: {
          borderColor: '#e8e6e0',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
        handleScale: { mouseWheel: true, pinch: true },
      })

      const series = chart.addCandlestickSeries({
        upColor: '#16a34a',
        downColor: '#dc2626',
        borderUpColor: '#16a34a',
        borderDownColor: '#dc2626',
        wickUpColor: 'rgba(22, 163, 74, 0.65)',
        wickDownColor: 'rgba(220, 38, 38, 0.65)',
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

  // ── All the rest of your logic stays exactly the same ──
  // (loadData, price lines, ATH lines, live updates, prompts, etc.)

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
          price: buyLine,
          color: '#16a34a', // --green
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `BUY ▶ PKR ${buyLine.toFixed(2)}`,
        })
      }
      if (sellLine) {
        sellLineRef.current = seriesRef.current.createPriceLine({
          price: sellLine,
          color: '#dc2626', // --red
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
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
          price: allTimeHigh,
          color: '#d97706', // --yellow
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: `ATH ${allTimeHigh.toFixed(2)}`,
        })
      }
      if (threeYearHigh && threeYearHigh !== allTimeHigh) {
        threeYrLineRef.current = seriesRef.current.createPriceLine({
          price: threeYearHigh,
          color: 'rgba(217, 119, 6, 0.55)', // faded yellow
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
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
    <div className="bg-white border border-[#e8e6e0] rounded-xl overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#e8e6e0] bg-[#fafaf8]">
        <div className="flex items-center gap-4">
          <div>
            <div className="font-bold text-2xl text-[#1a1916] tracking-tight">{symbol}</div>
            {currentPrice && (
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xl font-semibold text-[#1a1916]">
                  PKR {currentPrice.toFixed(2)}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    priceChange >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'
                  }`}
                >
                  {priceChange >= 0 ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#16a34a] animate-pulse" />
            <span className="text-xs font-medium text-[#6b6860] uppercase tracking-wide">Live</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Period buttons */}
          <div className="flex gap-1.5">
            {(['1y', '2y', '3y'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === p
                    ? 'bg-[#2563eb] text-white shadow-sm'
                    : 'bg-white text-[#6b6860] border border-[#e8e6e0] hover:border-[#a09e99] hover:text-[#1a1916]'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Line buttons – more dashboard-like */}
          <button
            onClick={handleSetBuyLine}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md border border-[#16a34a]/30 text-[#16a34a] hover:bg-[#16a34a]/10 transition-colors"
          >
            Buy Line {buyLine && <span className="opacity-80">({buyLine.toFixed(0)})</span>}
          </button>

          <button
            onClick={handleSetSellLine}
            className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded-md border border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/10 transition-colors"
          >
            Sell Line {sellLine && <span className="opacity-80">({sellLine.toFixed(0)})</span>}
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
            <div className="text-[#6b6860] text-sm font-medium tracking-wide animate-pulse">
              Loading chart data...
            </div>
          </div>
        )}
        <div ref={chartContainerRef} className="w-full" />
      </div>

      {/* Footer legend */}
      <div className="flex items-center gap-6 px-5 py-3 border-t border-[#e8e6e0] text-xs text-[#6b6860] bg-[#fafaf8]">
        {buyLine && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-[#16a34a]" />
            <span>Buy: PKR {buyLine.toFixed(2)}</span>
          </div>
        )}
        {sellLine && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-[#dc2626]" />
            <span>Sell: PKR {sellLine.toFixed(2)}</span>
          </div>
        )}
        {allTimeHigh && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t-2 border-dotted border-[#d97706]" />
            <span>ATH: PKR {allTimeHigh.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  )
}