export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/siagrd_access=([^;]+)/);
  return match ? match[1] : null;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const token = getToken();
    const res = await fetch(`${API_URL}/api/v1${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      cache: 'no-store',
    });
    if (res.status === 401) {
      window.location.href = '/login';
      return null;
    }
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
