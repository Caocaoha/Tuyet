import type { Metadata } from 'next'
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Tuyết — Voice Notes',
  description: 'Voice recording app with Obsidian integration',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        {children}
        <BottomNav />
      </body>
    </html>
  )
}
