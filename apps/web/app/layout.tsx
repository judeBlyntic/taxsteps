import type { Metadata, Viewport } from 'next'
import { Caprasimo, Figtree, Inter } from 'next/font/google'
import { ThemeScript } from '@/components/ThemeScript'
import { Providers } from './providers'
import './organic.css'
import './globals.css'
import './themes.css'

const caprasimo = Caprasimo({ weight: '400', subsets: ['latin', 'latin-ext'], variable: '--font-caprasimo', display: 'swap', preload: false })
const figtree = Figtree({ weight: ['400', '600', '700'], subsets: ['latin', 'latin-ext'], variable: '--font-figtree', display: 'swap', preload: false })
const inter = Inter({ weight: '400', subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Tax Steps', template: '%s · Tax Steps' },
  description: 'Tax Steps helps you organise and prepare your expense records for tax time.',
}

export const viewport: Viewport = { themeColor: '#f5f5f1', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${caprasimo.variable} ${figtree.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
