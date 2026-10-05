import type { Metadata, Viewport } from 'next'
import { Caprasimo, Figtree } from 'next/font/google'
import { Providers } from './providers'
import './organic.css'
import './globals.css'

const caprasimo = Caprasimo({ weight: '400', subsets: ['latin', 'latin-ext'], variable: '--font-caprasimo', display: 'swap' })
const figtree = Figtree({ weight: ['400', '600', '700'], subsets: ['latin', 'latin-ext'], variable: '--font-figtree', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'Tax Steps', template: '%s · Tax Steps' },
  description: 'Tax Steps helps you organise and prepare your expense records for tax time.',
}

export const viewport: Viewport = { themeColor: '#f5ead8', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${caprasimo.variable} ${figtree.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
