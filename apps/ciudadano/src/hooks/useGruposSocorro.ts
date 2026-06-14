import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../constants';
import { getToken } from '../services/auth.service';

const CACHE_KEY = 'satam_grupos_socorro_cache_v1';
const TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

export interface GrupoSocorro {
  id: string;
  nombre: string;
  tipo: string;
  municipio_id?: string;
  municipio_nombre?: string;
  activo: boolean;
  contacto?: string;
}

interface CacheEntry {
  timestamp: number;
  data: GrupoSocorro[];
}

interface UseGruposSocorroResult {
  grupos: GrupoSocorro[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useGruposSocorro(): UseGruposSocorroResult {
  const [grupos, setGrupos] = useState<GrupoSocorro[]>([]);
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
            if (!cancelled) { setGrupos(entry.data); setLoading(false); }
            return;
          }
        }

        const token = await getToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/grupos/socorro`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const raw: any[] = Array.isArray(json) ? json : (json.data ?? []);
        const data: GrupoSocorro[] = raw.map((g: any) => ({
          id: String(g.id),
          nombre: g.nombre,
          tipo: g.tipo ?? '',
          municipio_id: g.municipio_id ? String(g.municipio_id) : undefined,
          municipio_nombre: g.municipio_nombre ?? undefined,
          activo: g.activo !== false,
          contacto: g.contacto ?? undefined,
        }));

        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
        if (!cancelled) { setGrupos(data); setError(null); }
      } catch {
        try {
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached) {
            const entry: CacheEntry = JSON.parse(cached);
            if (!cancelled && entry.data.length > 0) setGrupos(entry.data);
          }
        } catch { /* nada */ }
        if (!cancelled) setError('No se pudieron cargar los cuerpos de socorro.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [rev]);

  return { grupos, loading, error, refresh: () => setRev((r) => r + 1) };
}
