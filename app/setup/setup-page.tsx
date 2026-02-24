// app/setup/page.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupPage() {
  const router = useRouter();
  const [bridgeUrl, setBridgeUrl] = useState('http://localhost:3001');
  const [bridgeApiKey, setBridgeApiKey] = useState('');
  const [appApiKey, setAppApiKey] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    setLoading(true);
    setStatus('');

    try {
      // Bước 1: Test bridge connection
      const bridgeRes = await fetch('/api/config/test-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bridgeUrl: bridgeUrl.replace(/\/$/, ''),
          apiKey: bridgeApiKey
        }),
      });
      const bridgeData = await bridgeRes.json();
      if (!bridgeData.success) {
        setStatus(`❌ Bridge lỗi: ${bridgeData.error}`);
        setLoading(false);
        return;
      }

      // Bước 2: Login với APP_API_KEY → nhận cookie
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: appApiKey }),
      });
      const loginData = await loginRes.json();
      if (!loginData.success) {
        setStatus(`❌ App API Key sai: ${loginData.error}`);
        setLoading(false);
        return;
      }

      // Lưu bridge config vào localStorage (không nhạy cảm)
      localStorage.setItem('appConfig', JSON.stringify({
        bridgeUrl: bridgeUrl.replace(/\/$/, ''),
        bridgeApiKey,
        vaultPath: bridgeData.vaultPath,
      }));

      setStatus('✅ Kết nối thành công!');
      setTimeout(() => router.push('/'), 1000);

    } catch (e) {
      setStatus(`❌ Lỗi: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 24 }}>Cài đặt Tuyết</h1>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
          Bridge URL
        </label>
        <input
          value={bridgeUrl}
          onChange={e => setBridgeUrl(e.target.value)}
          placeholder="http://localhost:3001"
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
        />
        <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          URL của Desktop Bridge (localhost hoặc ngrok)
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
          Bridge API Key
        </label>
        <input
          type="password"
          value={bridgeApiKey}
          onChange={e => setBridgeApiKey(e.target.value)}
          placeholder="API key trong file .env của Bridge"
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
          App API Key
        </label>
        <input
          type="password"
          value={appApiKey}
          onChange={e => setAppApiKey(e.target.value)}
          placeholder="Giá trị APP_API_KEY trong .env.local"
          style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
        />
        <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
          Tìm trong file .env.local: APP_API_KEY=...
        </p>
      </div>

      <button
        onClick={handleSetup}
        disabled={loading || !bridgeUrl || !bridgeApiKey || !appApiKey}
        style={{
          width: '100%', padding: '12px',
          background: loading ? '#ccc' : '#000',
          color: '#fff', border: 'none',
          borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 16
        }}
      >
        {loading ? 'Đang kết nối...' : 'Kết nối'}
      </button>

      {status && (
        <p style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
          {status}
        </p>
      )}
    </div>
  );
}
