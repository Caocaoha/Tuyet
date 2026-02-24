// lib/bridge-config.ts
export interface BridgeConfig {
  bridgeUrl: string;
  bridgeApiKey: string;
  vaultPath?: string;
}

export function getBridgeConfig(): BridgeConfig | null {
  if (typeof window === 'undefined') {
    // Server side: đọc từ env
    const bridgeUrl = process.env.OBSIDIAN_BRIDGE_URL;
    const bridgeApiKey = process.env.BRIDGE_API_KEY || '';
    if (!bridgeUrl) return null;
    return { bridgeUrl, bridgeApiKey };
  }
  // Client side: đọc từ localStorage
  const config = localStorage.getItem('appConfig');
  if (!config) return null;
  try {
    return JSON.parse(config);
  } catch {
    return null;
  }
}

export function isBridgeConfigured(): boolean {
  return getBridgeConfig() !== null;
}

export function saveBridgeConfig(config: BridgeConfig): void {
  localStorage.setItem('appConfig', JSON.stringify(config));
}

export function clearBridgeConfig(): void {
  localStorage.removeItem('appConfig');
}
