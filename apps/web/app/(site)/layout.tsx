import { MetaPixel } from '@/components/site/MetaPixel'

// Public website pages only (home, terms, privacy). The Meta Pixel lives here so it can never load in the app or on auth pages.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <MetaPixel />
    </>
  )
}
