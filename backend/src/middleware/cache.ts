const store = new Map<string, { data: any; exp: number }>();

export function getCached(key: string): any | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.exp) { store.delete(key); return null; }
  return entry.data;
}

export function setCached(key: string, data: any, ttlMs = 30000): void {
  store.set(key, { data, exp: Date.now() + ttlMs });
}
