export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.satam.corpofuturo.org';

/**
 * @deprecated El JWT ya no es legible por JS (DT-006) — el backend acepta la
 * cookie httpOnly `siagrd_token` directamente. Se mantiene como no-op para
 * no romper los `if (getToken()) headers.Authorization = ...` existentes;
 * simplemente dejan de agregar el header y la cookie httpOnly hace el trabajo.
 */
export function getToken(): string | null {
  return null;
}

// El panel (panel.satam.corpofuturo.org) y el backend (api.satam.corpofuturo.org)
// son origenes distintos — un fetch cross-origin no envia cookies salvo que se
// pida explicitamente. En vez de tocar cada uno de los ~30 call sites que hacen
// fetch(`${API_URL}/...`) directo, se parchea fetch una sola vez para que las
// llamadas al backend siempre incluyan credentials (la cookie httpOnly viaja
// sola gracias a Domain=.corpofuturo.org en produccion).
if (typeof window !== 'undefined') {
  const w = window as unknown as { __siagrdFetchPatched?: boolean };
  if (!w.__siagrdFetchPatched) {
    w.__siagrdFetchPatched = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith(API_URL)) {
        return originalFetch(input, { ...init, credentials: 'include' });
      }
      return originalFetch(input, init);
    };
  }
}

let isRefreshing = false;
let refreshQueue: Array<(ok: boolean) => void> = [];

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  const doRequest = () =>
    fetch(`${API_URL}/api/v1${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include',
      cache: 'no-store',
    });

  try {
    const res = await doRequest();

    if (res.status !== 401) {
      if (!res.ok) return null;
      return res.json();
    }

    // 401 — intentar refresh (la cookie siagrd_token se renueva sola en el servidor)
    if (isRefreshing) {
      const ok = await new Promise<boolean>((resolve) => {
        refreshQueue.push(resolve);
      });
      if (!ok) { window.location.href = '/login'; return null; }
      const retry = await doRequest();
      if (!retry.ok) { window.location.href = '/login'; return null; }
      return retry.json();
    }

    isRefreshing = true;
    const ok = await doRefresh();
    isRefreshing = false;
    refreshQueue.forEach((cb) => cb(ok));
    refreshQueue = [];

    if (!ok) { window.location.href = '/login'; return null; }

    const retry = await doRequest();
    if (!retry.ok) { window.location.href = '/login'; return null; }
    return retry.json();
  } catch {
    return null;
  }
}
