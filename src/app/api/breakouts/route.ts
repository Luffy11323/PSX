import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  return {
    token,
    supabase: createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
  }
}

export async function GET(req: NextRequest) {
  const { token, supabase } = getSupabase(req)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only return ATH data for stocks in the user's watchlist
  const { data: watchlist } = await supabase
    .from('watchlist')
    .select('symbol')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const symbols = (watchlist || []).map((w: any) => w.symbol)

  if (symbols.length === 0) {
    return NextResponse.json({ data: [] })
  }

  const { data, error } = await supabase
    .from('alltime_highs')
    .select('*')
    .in('symbol', symbols)
    .order('last_updated', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}