import type { Metadata } from 'next'
import { Bricolage_Grotesque, DM_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
})

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'PSX Sentinel — AI Stock Monitor',
  description: 'Industrial-grade AI-powered PSX stock monitoring with 3-layer signal engine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmMono.variable}`}>
      <body style={{ background: '#f7f6f3', fontFamily: 'var(--font-sans, system-ui)', margin: 0 }}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              border: '1px solid #e8e6e0',
              color: '#1a1917',
              fontFamily: 'var(--font-sans, system-ui)',
              fontSize: '13px',
              borderRadius: '12px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            },
          }}
        />
      </body>
    </html>
  )
}