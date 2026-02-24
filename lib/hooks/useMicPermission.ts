// lib/hooks/useMicPermission.ts
import { useState, useCallback } from 'react';

export type PermissionState = 'unknown' | 'checking' | 'granted' | 'denied' | 'prompt' | 'unavailable';

export function useMicPermission() {
  const [permissionState, setPermissionState] = useState<PermissionState>('unknown');

  const checkPermission = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
      setPermissionState('unavailable');
      return;
    }
    setPermissionState('checking');
    try {
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setPermissionState(result.state as PermissionState);
        result.onchange = () => {
          setPermissionState(result.state as PermissionState);
        };
      } else {
        // Fallback: browser doesn't support permissions API (e.g. older Safari)
        setPermissionState('prompt');
      }
    } catch {
      // Safari may throw on permissions.query for microphone
      setPermissionState('prompt');
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
      return true;
    } catch {
      setPermissionState('denied');
      return false;
    }
  }, []);

  return { permissionState, checkPermission, requestPermission };
}
