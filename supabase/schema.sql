-- PSX Sentinel Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'cfo', 'viewer')),
  full_name TEXT,
  alert_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Watchlist stocks
CREATE TABLE watchlist (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  company_name TEXT,
  buy_line DECIMAL(12,2),
  sell_line DECIMAL(12,2),
  is_active BOOLEAN DEFAULT TRUE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- Signal logs (every poll result stored)
CREATE TABLE signal_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  layer1_verdict TEXT CHECK (layer1_verdict IN ('BUY', 'SELL', 'HOLD', 'NEUTRAL', 'ERROR')),
  layer1_reason TEXT,
  layer1_data JSONB,
  layer2_verdict TEXT CHECK (layer2_verdict IN ('BUY', 'SELL', 'HOLD', 'NEUTRAL', 'ERROR')),
  layer2_reason TEXT,
  layer2_confidence DECIMAL(5,2),
  layer3_verdict TEXT CHECK (layer3_verdict IN ('BUY', 'SELL', 'HOLD', 'NEUTRAL', 'ERROR')),
  layer3_reason TEXT,
  consensus_score INTEGER DEFAULT 0,
  consensus_type TEXT,
  alert_sent BOOLEAN DEFAULT FALSE,
  buy_line_crossed BOOLEAN DEFAULT FALSE,
  sell_line_crossed BOOLEAN DEFAULT FALSE,
  is_alltime_breakout BOOLEAN DEFAULT FALSE
);

-- Price history (for charts and ML training)
CREATE TABLE price_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  volume BIGINT,
  open DECIMAL(12,2),
  high DECIMAL(12,2),
  low DECIMAL(12,2),
  close DECIMAL(12,2),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- All-time highs tracker
CREATE TABLE alltime_highs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT UNIQUE NOT NULL,
  all_time_high DECIMAL(12,2),
  all_time_high_date DATE,
  three_year_high DECIMAL(12,2),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Alert notifications log
CREATE TABLE alert_notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('BUY_LINE', 'SELL_LINE', 'SIGNAL_1_3', 'SIGNAL_2_3', 'SIGNAL_3_3', 'BREAKOUT', 'WEEKLY_REPORT')),
  price DECIMAL(12,2),
  message TEXT,
  sent_to TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  signal_log_id UUID REFERENCES signal_logs(id)
);

-- App settings (per user)
CREATE TABLE app_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  poll_interval_seconds INTEGER DEFAULT 60 CHECK (poll_interval_seconds BETWEEN 60 AND 120),
  alert_on_1_of_3 BOOLEAN DEFAULT TRUE,
  alert_on_2_of_3 BOOLEAN DEFAULT TRUE,
  alert_on_3_of_3 BOOLEAN DEFAULT TRUE,
  alert_on_line_crossing BOOLEAN DEFAULT TRUE,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME DEFAULT '23:00',
  quiet_hours_end TIME DEFAULT '09:00',
  weekly_report_enabled BOOLEAN DEFAULT TRUE,
  weekly_report_day INTEGER DEFAULT 1 CHECK (weekly_report_day BETWEEN 0 AND 6),
  weekly_report_time TIME DEFAULT '09:00',
  alert_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_signal_logs_symbol ON signal_logs(symbol);
CREATE INDEX idx_signal_logs_timestamp ON signal_logs(timestamp DESC);
CREATE INDEX idx_price_history_symbol_time ON price_history(symbol, recorded_at DESC);
CREATE INDEX idx_watchlist_user ON watchlist(user_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE alltime_highs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can manage own watchlist" ON watchlist FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view signals" ON signal_logs FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Service role can insert signals" ON signal_logs FOR INSERT TO service_role WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can view prices" ON price_history FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Service role can insert prices" ON price_history FOR INSERT TO service_role WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can view highs" ON alltime_highs FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Service role can manage highs" ON alltime_highs FOR ALL TO service_role USING (TRUE);

CREATE POLICY "Authenticated users can view alerts" ON alert_notifications FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Service role can insert alerts" ON alert_notifications FOR INSERT TO service_role WITH CHECK (TRUE);

CREATE POLICY "Users can manage own settings" ON app_settings FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'cfo');
  
  INSERT INTO public.app_settings (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
