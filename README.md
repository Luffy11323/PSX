# PSX Sentinel — AI-Powered Stock Alert System

Industrial-grade 3-layer stock monitoring for PSX with live charts, smart alerts, and confidence scoring.

## Architecture
- **Frontend**: Next.js 14 + TailwindCSS + TradingView Lightweight Charts
- **Backend**: Next.js API Routes (Vercel Serverless)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email + password)
- **Layer 1**: TA-Lib RSI/MACD (rule-based)
- **Layer 2**: HuggingFace Inference API (ML model)
- **Layer 3**: Groq API — Mistral 7B (LLM reasoning)
- **Alerts**: Resend (email)
- **Scheduler**: Vercel Cron (every 1–2 min)
- **Hosting**: Vercel (free tier)

## Setup Instructions

### 1. Prerequisites
- Node.js 18+
- Vercel account (free)
- Supabase account (free)
- Groq API key (free) — https://console.groq.com
- HuggingFace token (free) — https://huggingface.co/settings/tokens
- Resend API key (free) — https://resend.com

### 2. Install Dependencies
```bash
npm install
```

### 3. Supabase Setup
1. Create a new Supabase project
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key

### 4. Environment Variables
Copy `.env.example` to `.env.local` and fill in all values:
```bash
cp .env.example .env.local
```

### 5. Create Admin User
In Supabase dashboard → Authentication → Users → Add user manually:
- Email: your email
- Password: your password

Then in SQL Editor:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 6. Run Locally
```bash
npm run dev
```

### 7. Deploy to Vercel
```bash
npx vercel --prod
```
Add all environment variables in Vercel dashboard → Settings → Environment Variables.

## Features
- ✅ Live PSX stock charts with draggable BUY/SELL lines
- ✅ 3-layer AI signal engine (non-blocking, all results stored)
- ✅ Confidence scoring: 1/3, 2/3, 3/3 with per-layer reasoning
- ✅ Email alerts on signal events and line crossings
- ✅ All-time breakout detection (3yr historical data)
- ✅ Weekly performance reports (configurable day/time)
- ✅ Quiet hours support
- ✅ Admin + CFO roles
- ✅ Full signal history log
- ✅ Configurable poll interval (1–2 min)
