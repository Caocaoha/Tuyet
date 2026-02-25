// lib/hooks/useOfflineQueue.ts
// Offline queue is handled by the main recording flow in v2.
import { useCallback, useState } from 'react';

export function useOfflineQueue() {
  const [pendingCount] = useState(0);
  const [isProcessing] = useState(false);

  const processQueue = useCallback(async () => {
    // No-op in v2 — offline audio is saved directly to IndexedDB
  }, []);

  return { pendingCount, isProcessing, processQueue };
}
