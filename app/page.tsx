// ============================================================
// app/page.tsx — Main Screen (Idle State)
// ============================================================
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MicButton from '@/components/MicButton';
import StatusToast from '@/components/StatusToast';
import BridgeStatus from '@/components/BridgeStatus';
import { checkBridgeConnection } from '@/lib/obsidian/bridge';
import { getLastSaveStatus } from '@/lib/audio/db';

export default function HomePage() {
  const router = useRouter();
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [lastSave, setLastSave] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check if setup is complete
    const config = localStorage.getItem('appConfig');
    if (!config) {
      router.push('/setup');
      return;
    }

    setIsReady(true);

    // Check bridge status
    checkBridgeConnection().then(setBridgeConnected);

    // Load last save status
    getLastSaveStatus().then(status => {
      if (status) {
        setLastSave(status.timestamp);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    });
  }, []);

  const handleStartRecording = () => {
    router.push('/recording');
  };

  const handleSearch = () => {
    router.push('/search');
  };

  const handleReview = () => {
    router.push('/review');
  };

  if (!isReady) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 py-8">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold text-blue-900">TUYẾT</h1>
        <button
          onClick={handleReview}
          className="text-2xl"
          aria-label="Voice Review"
        >
          🔔
        </button>
      </header>

      <main className="max-w-md mx-auto space-y-8">
        <div className="text-center">
          <MicButton 
            onStart={handleStartRecording}
            size="large"
          />
        </div>

        <div className="relative">
          <div className="border-t border-gray-300 mb-4" />
          <div className="text-center text-gray-500 mb-4">
            hoặc gõ lệnh...
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm hoặc ra lệnh..."
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onFocus={handleSearch}
          />
        </div>

        {showToast && lastSave && (
          <StatusToast
            message={`✅ Đã lưu lúc ${new Date(lastSave).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
            type="success"
          />
        )}

        <BridgeStatus connected={bridgeConnected} />
      </main>
    </div>
  );
}
