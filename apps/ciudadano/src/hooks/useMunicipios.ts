import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND = 'https://backend-production-60016.up.railway.app/api/v1';
const CACHE_KEY = 'satam_municipios_cache_v3';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export interface Municipio {
  id: string;        // UUID — usado en POST /incidentes como municipio_id
  codigo: string;    // código DANE — usado para identificar en el picker
  nombre: string;
  latitud?: number;
  longitud?: number;
}

interface CacheEntry {
  timestamp: number;
  data: Municipio[];
}

interface UseMunicipiosResult {
  municipios: Municipio[];
  loading: boolean;
  error: string | null;
}

export function useMunicipios(): UseMunicipiosResult {
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          const age = Date.now() - entry.timestamp;
          if (age < TTL_MS && entry.data.length > 0) {
            if (!cancelled) { setMunicipios(entry.data); setLoading(false); }
            return;
          }
        }

        // Filtrar solo departamento 50 = Meta
        const response = await fetch(`${BACKEND}/municipios?departamento=50`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        const raw: any[] = Array.isArray(json) ? json : (json.data ?? []);
        const data: Municipio[] = raw.map((m: any) => ({
          id: String(m.id),
          codigo: m.codigo_dane ?? m.codigo ?? String(m.id),
          nombre: m.nombre,
          latitud: m.latitud != null ? Number(m.latitud) : undefined,
          longitud: m.longitud != null ? Number(m.longitud) : undefined,
        }));

        const entry: CacheEntry = { timestamp: Date.now(), data };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));

        if (!cancelled) { setMunicipios(data); setError(null); }
      } catch (err) {
        try {
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached) {
            const entry: CacheEntry = JSON.parse(cached);
            if (!cancelled && entry.data.length > 0) setMunicipios(entry.data);
          }
        } catch { /* nada */ }
        if (!cancelled) setError('No se pudieron cargar los municipios.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { municipios, loading, error };
}
