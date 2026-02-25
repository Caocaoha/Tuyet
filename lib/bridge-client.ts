export interface BridgeHealthResponse {
  status: 'ok' | 'error';
  version?: string;
  obsidianConnected?: boolean;
  error?: string;
}

export async function testBridgeConnection(
  bridgeUrl: string,
  bridgeKey: string
): Promise<BridgeHealthResponse> {
  // Proxy via server-side API to avoid ngrok browser interstitial (returns HTML, not JSON)
  try {
    const response = await fetch('/api/config/test-bridge', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bridgeUrl, bridgeKey }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        status: 'error',
        error: `HTTP ${response.status}: ${await response.text()}`,
      };
    }

    return response.json();
  } catch (err) {
    return {
      status: 'error',
      error: `Network error: ${(err as Error).message}`,
    };
  }
}

export function generateBridgeKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

export function saveBridgeConfig(config: {
  bridgeUrl: string;
  bridgeKey: string;
  obsidianApiKey: string;
  vaultName: string;
  username: string;
}): void {
  if (typeof window === 'undefined') return;
  
  const key = `bridge-config-${config.username}`;
  localStorage.setItem(key, JSON.stringify(config));
}

export function loadBridgeConfig(username: string): {
  bridgeUrl: string;
  bridgeKey: string;
  obsidianApiKey: string;
  vaultName: string;
} | null {
  if (typeof window === 'undefined') return null;
  
  const key = `bridge-config-${username}`;
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}
