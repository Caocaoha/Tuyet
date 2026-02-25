'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/', label: 'Lịch sử', emoji: '📝' },
  { href: '/recording', label: 'Ghi âm', emoji: '🎙️', isCenter: true },
  { href: '/setup', label: 'Cài đặt', emoji: '⚙️' },
];

const HIDDEN_ROUTES = ['/recording', '/setup'];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_ROUTES.includes(pathname)) return null;

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: '#fff',
      borderTop: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      zIndex: 100,
      boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = pathname === item.href;
        if (item.isCenter) {
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                marginTop: -16,
                boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
              }}>
                {item.emoji}
              </div>
            </Link>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <span style={{ fontSize: 22 }}>{item.emoji}</span>
            <span style={{
              fontSize: 11,
              color: isActive ? '#3b82f6' : '#888',
              fontWeight: isActive ? 600 : 400,
            }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
