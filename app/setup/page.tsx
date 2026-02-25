'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { testBridgeConnection, generateBridgeKey, saveBridgeConfig } from '@/lib/bridge-client';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'user' | 'bridge'>('user');
  
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [bridgeUrl, setBridgeUrl] = useState('http://localhost:3001');
  const [bridgeKey, setBridgeKey] = useState('');
  const [obsidianApiKey, setObsidianApiKey] = useState('');
  const [vaultName, setVaultName] = useState('');
  
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, apiKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      setStep('bridge');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleTestBridge = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await testBridgeConnection(bridgeUrl, bridgeKey);
      if (result.status === 'ok') {
        setTestResult(`✓ Connected — Bridge v${result.version || 'unknown'}`);
      } else {
        setTestResult(`✗ ${result.error}`);
      }
    } catch (err) {
      setTestResult(`✗ ${(err as Error).message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleBridgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveBridgeConfig({
      bridgeUrl,
      bridgeKey,
      obsidianApiKey,
      vaultName,
      username,
    });
    router.push('/');
  };

  const handleGenerateKey = () => {
    setBridgeKey(generateBridgeKey());
  };

  if (step === 'user') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Chào mừng đến Tuyết v2</h1>
            
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username (2-20 chars, a-z0-9-)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  pattern="[a-z0-9-]{2,20}"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                Tiếp tục
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Setup Desktop Bridge</h2>
          
          <form onSubmit={handleBridgeSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bridge URL (ngrok URL in production)
              </label>
              <input
                type="url"
                value={bridgeUrl}
                onChange={(e) => setBridgeUrl(e.target.value)}
                required
                placeholder="http://localhost:3001 or https://xxx.ngrok-free.app"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bridge API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={bridgeKey}
                  onChange={(e) => setBridgeKey(e.target.value)}
                  required
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={handleGenerateKey}
                  className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Generate
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Obsidian API Key
              </label>
              <input
                type="text"
                value={obsidianApiKey}
                onChange={(e) => setObsidianApiKey(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vault Name
              </label>
              <input
                type="text"
                value={vaultName}
                onChange={(e) => setVaultName(e.target.value)}
                required
                placeholder="MyVault"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="button"
              onClick={handleTestBridge}
              disabled={testing || !bridgeUrl || !bridgeKey}
              className="w-full bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-800 font-semibold py-3 rounded-lg transition-colors"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>

            {testResult && (
              <div className={`rounded-lg p-3 ${
                testResult.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                <p className="text-sm">{testResult}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Hoàn tất
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
