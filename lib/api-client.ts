// lib/api-client.ts
// Cookie được browser tự gửi — không cần thêm Authorization header

export async function apiFetch(path: string, options: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'include',  // gửi cookie tự động
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      signal: AbortSignal.timeout(30000)
    });
  } catch (fetchError) {
    throw new Error(`Network error: ${(fetchError as Error).message}`);
  }

  // Session hết hạn → redirect về setup
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/setup';
    }
    throw new Error('Session expired');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response.json();
}

export function getAuthHeaders(): Record<string, string> {
  // Không cần nữa — dùng cookie
  // Giữ lại để không break imports hiện tại
  return { 'Content-Type': 'application/json' };
}
