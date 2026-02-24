import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tuyết — Voice Notes',
  description: 'Voice recording app with Obsidian integration',
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
