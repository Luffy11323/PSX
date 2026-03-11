import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchLivePrice, fetchHistoricalData } from '@/lib/services/priceFetcher'

export async function GET(
  req: NextRequest,
  { params }: { params: { symbol: string } }
) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const includeHistory = searchParams.get('history') === 'true'
  const period = (searchParams.get('period') || '1y') as '1y' | '2y' | '3y'

  const [quote, history] = await Promise.all([
    fetchLivePrice(params.symbol),
    includeHistory ? fetchHistoricalData(params.symbol, period) : Promise.resolve([]),
  ])

  const { data: ath } = await supabase
    .from('alltime_highs')
    .select('*')
    .eq('symbol', params.symbol.toUpperCase())
    .single()

  return NextResponse.json({ quote, history, allTimeHigh: ath })
}