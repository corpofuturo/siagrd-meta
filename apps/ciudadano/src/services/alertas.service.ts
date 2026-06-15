import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE, CACHE_ALERTAS_TTL_MS, type NivelAlerta } from '../constants';

export interface Alerta {
  id: string;
  municipio_codigo: string;
  nivel: NivelAlerta;
  tipo_amenaza: string;
  titulo: string;
  descripcion: string;
  instrucciones: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

const CACHE_KEY = '@siagrd:alertas_cache';
const CACHE_TS_KEY = '@siagrd:alertas_cache_ts';

const NIVEL_PESO: Record<NivelAlerta, number> = {
  VERDE: 0,
  AMARILLO: 1,
  NARANJA: 2,
  ROJO: 3,
};

/**
 * Obtiene alertas activas desde el backend.
 * No requiere autenticación — datos públicos.
 */
export async function getAlertasActivas(): Promise<Alerta[]> {
  const response = await fetch(`${API_BASE}/alertas?activa=true`);
  if (!response.ok) throw new Error(`Error obteniendo alertas: ${response.status}`);
  const json = await response.json();
  const data: unknown[] = Array.isArray(json) ? json : (json?.data ?? []);
  return data as Alerta[];
}

/**
 * Retorna el nivel de alerta más alto de la lista.
 */
export function getNivelMaximo(alertas: Alerta[]): NivelAlerta {
  if (!alertas.length) return 'VERDE';
  return alertas.reduce<NivelAlerta>((max, alerta) => {
    return NIVEL_PESO[alerta.nivel] > NIVEL_PESO[max] ? alerta.nivel : max;
  }, 'VERDE');
}

/**
 * Lee alertas desde AsyncStorage sin verificar TTL.
 */
export async function getAlertasCached(): Promise<Alerta[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Alerta[];
  } catch {
    return null;
  }
}

/**
 * Guarda alertas en AsyncStorage con timestamp actual.
 */
export async function setAlertasCache(alertas: Alerta[]): Promise<void> {
  await AsyncStorage.multiSet([
    [CACHE_KEY, JSON.stringify(alertas)],
    [CACHE_TS_KEY, String(Date.now())],
  ]);
}

/**
 * Retorna alertas desde cache si el TTL de 15 min no expiró,
 * de lo contrario hace fetch al backend y actualiza el cache.
 * Fallback a cache expirado (incluso vacío) si hay error de red.
 */
export async function getAlertasCachedOrFetch(): Promise<Alerta[]> {
  try {
    const tsRaw = await AsyncStorage.getItem(CACHE_TS_KEY);
    const ts = tsRaw ? parseInt(tsRaw, 10) : 0;

    if (Date.now() - ts < CACHE_ALERTAS_TTL_MS) {
      const cached = await getAlertasCached();
      if (cached) return cached;
    }

    const alertas = await getAlertasActivas();
    await setAlertasCache(alertas);
    return alertas;
  } catch {
    const cached = await getAlertasCached();
    return cached ?? [];
  }
}

/**
 * Retorna alertas activas filtradas por municipio.
 */
export async function getAlertasMunicipio(municipioCodigo: string): Promise<Alerta[]> {
  const alertas = await getAlertasCachedOrFetch();
  return alertas.filter((a) => a.municipio_codigo === municipioCodigo);
}
