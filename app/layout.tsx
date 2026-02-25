import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import BottomNavigation from '@/components/BottomNavigation';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'Tuyết',
  description: 'Voice-first task & note manager',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <div className="min-h-screen pb-16">
          {children}
        </div>
        <BottomNavigation />
      </body>
    </html>
  );
}
