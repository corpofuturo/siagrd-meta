import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND = 'https://backend-production-60016.up.railway.app/api/v1';
const CACHE_KEY = 'satam_municipios_cache_v2';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

export interface Municipio {
  codigo: string;
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
        // Revisar caché primero
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          const age = Date.now() - entry.timestamp;
          if (age < TTL_MS && entry.data.length > 0) {
            if (!cancelled) {
              setMunicipios(entry.data);
              setLoading(false);
            }
            return;
          }
        }

        // Fetch desde la API — por ahora hardcodeado a Meta (50) hasta config dinámica
        const response = await fetch(`${BACKEND}/municipios?departamento=50`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        // La API devuelve { data: [...], total: N } — normalizar a Municipio[]
        const raw: any[] = Array.isArray(json) ? json : (json.data ?? []);
        const data: Municipio[] = raw.map((m: any) => ({
          codigo: m.codigo_dane ?? m.codigo ?? String(m.id),
          nombre: m.nombre,
          latitud: m.latitud != null ? Number(m.latitud) : undefined,
          longitud: m.longitud != null ? Number(m.longitud) : undefined,
        }));

        // Guardar en caché
        const entry: CacheEntry = { timestamp: Date.now(), data };
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));

        if (!cancelled) {
          setMunicipios(data);
          setError(null);
        }
      } catch (err) {
        // Si falla la red, intentar usar caché expirado como fallback
        try {
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached) {
            const entry: CacheEntry = JSON.parse(cached);
            if (!cancelled && entry.data.length > 0) {
              setMunicipios(entry.data);
            }
          }
        } catch {
          // nada
        }
        if (!cancelled) {
          setError('No se pudieron cargar los municipios.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { municipios, loading, error };
}
