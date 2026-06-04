import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, type Database } from '../lib/supabase';
import { CACHE_ALERTAS_TTL_MS, type NivelAlerta } from '../constants';

type Alerta = Database['public']['Tables']['alertas']['Row'];

const CACHE_KEY = '@siagrd:alertas_cache';
const CACHE_TS_KEY = '@siagrd:alertas_cache_ts';

const NIVEL_PESO: Record<NivelAlerta, number> = {
  VERDE: 0,
  AMARILLO: 1,
  NARANJA: 2,
  ROJO: 3,
};

/**
 * Obtiene alertas activas desde Supabase.
 * No requiere autenticación — datos públicos.
 */
export async function getAlertasActivas(): Promise<Alerta[]> {
  const { data, error } = await supabase
    .from('alertas')
    .select('*')
    .eq('activa', true)
    .order('nivel', { ascending: false });

  if (error) throw new Error(`Error obteniendo alertas: ${error.message}`);
  return (data as Alerta[]) ?? [];
}

/**
 * Retorna el nivel de alerta más alto de la lista.
 */
export function getNivelMaximo(alertas: Alerta[]): NivelAlerta {
  if (!alertas.length) return 'VERDE';
  return alertas.reduce<NivelAlerta>((max, alerta) => {
    const nivel = alerta.nivel as NivelAlerta;
    return NIVEL_PESO[nivel] > NIVEL_PESO[max] ? nivel : max;
  }, 'VERDE');
}

/**
 * Lee alertas desde AsyncStorage sin verificar TTL.
 * Retorna null si no hay cache.
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
 * Retorna alertas desde cache si el TTL de 15 min no ha expirado,
 * de lo contrario hace fetch a Supabase y actualiza el cache.
 * Fallback a cache expirado si hay error de red.
 */
export async function getAlertasCachedOrFetch(): Promise<Alerta[]> {
  try {
    const tsRaw = await AsyncStorage.getItem(CACHE_TS_KEY);
    const ts = tsRaw ? parseInt(tsRaw, 10) : 0;
    const age = Date.now() - ts;

    if (age < CACHE_ALERTAS_TTL_MS) {
      const cached = await getAlertasCached();
      if (cached) return cached;
    }

    const alertas = await getAlertasActivas();
    await setAlertasCache(alertas);
    return alertas;
  } catch {
    // Sin red: retornar cache aunque esté expirado
    const cached = await getAlertasCached();
    return cached ?? [];
  }
}

/**
 * Retorna alertas activas filtradas por municipio.
 */
export async function getAlertasMunicipio(
  municipioCodigo: string
): Promise<Alerta[]> {
  const alertas = await getAlertasCachedOrFetch();
  return alertas.filter((a) => a.municipio_codigo === municipioCodigo);
}
