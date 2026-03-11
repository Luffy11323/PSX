import type { Metadata } from 'next'
import { Space_Mono, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
})

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'PSX Sentinel — AI Stock Monitor',
  description: 'Industrial-grade AI-powered PSX stock monitoring with 3-layer signal engine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${bebasNeue.variable}`}>
      <body className="bg-sentinel-bg text-sentinel-text font-mono antialiased">
        {children}
        <Toaster
          theme="dark"
          toastOptions={{
            style: {
              background: '#141d35',
              border: '1px solid #1e2d4a',
              color: '#e2e8f0',
              fontFamily: 'var(--font-mono)',
            }
          }}
        />
      </body>
    </html>
  )
}
