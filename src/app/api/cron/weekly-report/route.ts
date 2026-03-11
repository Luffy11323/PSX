// /api/cron/weekly-report — runs every Monday at 9 AM PKT (4 AM UTC)
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase/server'
import { sendWeeklyReport } from '@/lib/services/emailService'
import { format, subDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminSupabase()
  const now = new Date()
  const weekAgo = subDays(now, 7)

  // Get all users with weekly reports enabled
  const { data: settingsList } = await supabase
    .from('app_settings')
    .select('*, profiles(email, alert_email)')
    .eq('weekly_report_enabled', true)

  if (!settingsList?.length) {
    return NextResponse.json({ message: 'No users with weekly reports enabled' })
  }

  for (const settings of settingsList) {
    try {
      // Check if today matches the user's preferred report day
      if (settings.weekly_report_day !== now.getDay()) continue

      const alertEmail = settings.alert_email || (settings.profiles as any)?.email
      if (!alertEmail) continue

      // Get signals from past week
      const { data: signals } = await supabase
        .from('signal_logs')
        .select('*')
        .gte('timestamp', weekAgo.toISOString())
        .order('timestamp', { ascending: false })

      // Get alerts sent
      const { data: alerts } = await supabase
        .from('alert_notifications')
        .select('*')
        .gte('sent_at', weekAgo.toISOString())

      // Get breakouts
      const breakouts = signals?.filter((s: any) => s.is_alltime_breakout) || []

      // Top performers by consensus score
      const symbolScores = new Map<string, number>()
      signals?.forEach((s: any) => {
        const current = symbolScores.get(s.symbol) || 0
        symbolScores.set(s.symbol, Math.max(current, s.consensus_score))
      })
      const topPerformers = Array.from(symbolScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([symbol, score]) => ({ symbol, score }))

      await sendWeeklyReport(alertEmail, {
        signals: signals || [],
        topPerformers,
        breakouts: breakouts.map((b: any) => ({ symbol: b.symbol, price: b.price })),
        alertsSent: alerts?.length || 0,
        period: `${format(weekAgo, 'MMM d')} – ${format(now, 'MMM d, yyyy')}`,
      })

    } catch (err) {
      console.error('[WeeklyReport] Error for settings:', settings.user_id, err)
    }
  }

  return NextResponse.json({ success: true, sent: settingsList.length })
}
