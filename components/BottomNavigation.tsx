'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Home, Mic, BarChart3, History } from 'lucide-react';

export default function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { id: 'tasks', label: 'Tasks', icon: Home, route: '/' },
    { id: 'history', label: 'History', icon: History, route: '/history' },
    { id: 'record', label: 'Record', icon: Mic, route: '/recording' },
    { id: 'reports', label: 'Reports', icon: BarChart3, route: '/reports' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border pb-safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-screen-sm mx-auto px-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.route;
          
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.route)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
