export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_access=([^;]+)/);
  return match ? match[1] : null;
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

async function doRefresh(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  const doRequest = async (token: string | null) => {
    return fetch(`${API_URL}/api/v1${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      cache: 'no-store',
    });
  };

  try {
    const res = await doRequest(getToken());

    if (res.status !== 401) {
      if (!res.ok) return null;
      return res.json();
    }

    // 401 — intentar refresh
    if (isRefreshing) {
      // Otro refresh en curso, encolar
      const newToken = await new Promise<string | null>((resolve) => {
        refreshQueue.push(resolve);
      });
      if (!newToken) { window.location.href = '/login'; return null; }
      const retry = await doRequest(newToken);
      if (!retry.ok) { window.location.href = '/login'; return null; }
      return retry.json();
    }

    isRefreshing = true;
    const newToken = await doRefresh();
    isRefreshing = false;
    refreshQueue.forEach((cb) => cb(newToken));
    refreshQueue = [];

    if (!newToken) { window.location.href = '/login'; return null; }

    const retry = await doRequest(newToken);
    if (!retry.ok) { window.location.href = '/login'; return null; }
    return retry.json();
  } catch {
    return null;
  }
}
