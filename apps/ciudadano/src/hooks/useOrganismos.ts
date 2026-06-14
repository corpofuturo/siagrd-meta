import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../constants';
import { getToken } from '../services/auth.service';

const CACHE_KEY = 'satam_organismos_cache_v1';
const TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

export interface Organismo {
  id: string;
  nombre: string;
  tipo: string;
  municipio_id?: string;
  municipio_nombre?: string;
  activo: boolean;
}

interface CacheEntry {
  timestamp: number;
  data: Organismo[];
}

interface UseOrganismosResult {
  organismos: Organismo[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useOrganismos(): UseOrganismosResult {
  const [organismos, setOrganismos] = useState<Organismo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          const age = Date.now() - entry.timestamp;
          if (age < TTL_MS && entry.data.length > 0) {
            if (!cancelled) { setOrganismos(entry.data); setLoading(false); }
            return;
          }
        }

        const token = await getToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/organismos`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const raw: any[] = Array.isArray(json) ? json : (json.data ?? []);
        const data: Organismo[] = raw.map((o: any) => ({
          id: String(o.id),
          nombre: o.nombre,
          tipo: o.tipo ?? '',
          municipio_id: o.municipio_id ? String(o.municipio_id) : undefined,
          municipio_nombre: o.municipio_nombre ?? undefined,
          activo: o.activo !== false,
        }));

        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
        if (!cancelled) { setOrganismos(data); setError(null); }
      } catch {
        try {
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached) {
            const entry: CacheEntry = JSON.parse(cached);
            if (!cancelled && entry.data.length > 0) setOrganismos(entry.data);
          }
        } catch { /* nada */ }
        if (!cancelled) setError('No se pudieron cargar los organismos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [rev]);

  return { organismos, loading, error, refresh: () => setRev((r) => r + 1) };
}
