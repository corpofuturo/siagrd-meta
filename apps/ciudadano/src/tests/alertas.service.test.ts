/**
 * Tests del servicio de alertas — apps/ciudadano
 * Verifica obtención, filtrado por municipio y comportamiento del cache local.
 */

import { jest } from '@jest/globals';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Cache en memoria que simula AsyncStorage
const asyncStorageStore: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => asyncStorageStore[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    asyncStorageStore[key] = value;
  }),
  multiSet: jest.fn(async (pairs: [string, string][]) => {
    for (const [k, v] of pairs) asyncStorageStore[k] = v;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete asyncStorageStore[key];
  }),
}));

// Mock supabase — controlado por cada test
const mockSupabaseSelect = {
  from: jest.fn(),
};

jest.mock('../lib/supabase', () => ({
  supabase: mockSupabaseSelect,
}));

jest.mock('../constants', () => ({
  CACHE_ALERTAS_TTL_MS: 900_000,
}));

// ── Imports bajo mocks ────────────────────────────────────────────────────────

import {
  getAlertasActivas,
  getAlertasCached,
  setAlertasCache,
  getAlertasCachedOrFetch,
  getAlertasMunicipio,
  getNivelMaximo,
} from '../services/alertas.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildAlerta(overrides: Partial<{
  id: string;
  municipio_codigo: string;
  nivel: 'VERDE' | 'AMARILLO' | 'NARANJA' | 'ROJO';
  tipo_amenaza: string;
  titulo: string;
  descripcion: string;
  instrucciones: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}> = {}) {
  return {
    id: 'alerta-1',
    municipio_codigo: '50001',
    nivel: 'VERDE' as const,
    tipo_amenaza: 'inundacion',
    titulo: 'Alerta de prueba',
    descripcion: 'Descripcion de prueba',
    instrucciones: null,
    activa: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function buildSupabaseChain(result: { data: unknown; error: unknown }) {
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue(result),
      }),
    }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Limpiar store de AsyncStorage simulado
  for (const key of Object.keys(asyncStorageStore)) {
    delete asyncStorageStore[key];
  }
  jest.clearAllMocks();
});

describe('alertas.service — getAlertasActivas', () => {
  it('la función existe y es callable', () => {
    expect(typeof getAlertasActivas).toBe('function');
  });

  it('retorna array vacío si Supabase devuelve data null', async () => {
    mockSupabaseSelect.from = jest.fn().mockReturnValue(
      buildSupabaseChain({ data: null, error: null })
    );
    const result = await getAlertasActivas();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('retorna alertas cuando Supabase responde con datos', async () => {
    const alertas = [buildAlerta({ id: 'a-1' }), buildAlerta({ id: 'a-2' })];
    mockSupabaseSelect.from = jest.fn().mockReturnValue(
      buildSupabaseChain({ data: alertas, error: null })
    );
    const result = await getAlertasActivas();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a-1');
  });

  it('lanza error si Supabase retorna un error', async () => {
    mockSupabaseSelect.from = jest.fn().mockReturnValue(
      buildSupabaseChain({ data: null, error: { message: 'connection refused' } })
    );
    await expect(getAlertasActivas()).rejects.toThrow('connection refused');
  });
});

describe('alertas.service — filtro por municipio', () => {
  it('getAlertasMunicipio retorna solo alertas del municipio dado', async () => {
    const alertas = [
      buildAlerta({ id: 'a-1', municipio_codigo: '50001' }),
      buildAlerta({ id: 'a-2', municipio_codigo: '50006' }),
      buildAlerta({ id: 'a-3', municipio_codigo: '50001' }),
    ];
    // Cache fresco con todas las alertas
    await setAlertasCache(alertas);
    // Forzar cache válido (timestamp reciente)
    asyncStorageStore['@siagrd:alertas_cache_ts'] = String(Date.now());

    const result = await getAlertasMunicipio('50001');
    expect(result).toHaveLength(2);
    expect(result.every((a) => a.municipio_codigo === '50001')).toBe(true);
  });

  it('retorna array vacío si ninguna alerta corresponde al municipio', async () => {
    await setAlertasCache([buildAlerta({ municipio_codigo: '50006' })]);
    asyncStorageStore['@siagrd:alertas_cache_ts'] = String(Date.now());

    const result = await getAlertasMunicipio('50001');
    expect(result).toHaveLength(0);
  });
});

describe('alertas.service — cache local', () => {
  it('getAlertasCached retorna null si no hay datos guardados', async () => {
    const result = await getAlertasCached();
    expect(result).toBeNull();
  });

  it('setAlertasCache guarda y getAlertasCached recupera los datos', async () => {
    const alertas = [buildAlerta({ id: 'cache-1' })];
    await setAlertasCache(alertas);
    const recovered = await getAlertasCached();
    expect(recovered).not.toBeNull();
    expect(recovered![0].id).toBe('cache-1');
  });

  it('segunda llamada sin red usa datos del cache expirado', async () => {
    const alertasOriginales = [buildAlerta({ id: 'cached-stale' })];
    await setAlertasCache(alertasOriginales);
    // Timestamp muy antiguo → cache expirado
    asyncStorageStore['@siagrd:alertas_cache_ts'] = String(Date.now() - 10_000_000);

    // Supabase falla → simula sin red
    mockSupabaseSelect.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockRejectedValue(new Error('Network request failed')),
        }),
      }),
    });

    const result = await getAlertasCachedOrFetch();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].id).toBe('cached-stale');
  });

  it('cache válido evita llamada a Supabase', async () => {
    const alertas = [buildAlerta({ id: 'fresh-cache' })];
    await setAlertasCache(alertas);
    asyncStorageStore['@siagrd:alertas_cache_ts'] = String(Date.now()); // reciente

    const fromSpy = jest.fn();
    mockSupabaseSelect.from = fromSpy;

    const result = await getAlertasCachedOrFetch();
    expect(fromSpy).not.toHaveBeenCalled();
    expect(result[0].id).toBe('fresh-cache');
  });

  it('retorna array vacío (no lanza error) si no hay red y no hay cache', async () => {
    mockSupabaseSelect.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          order: jest.fn().mockRejectedValue(new Error('Network request failed')),
        }),
      }),
    });

    const result = await getAlertasCachedOrFetch();
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe('alertas.service — getNivelMaximo', () => {
  it('retorna VERDE si la lista está vacía', () => {
    expect(getNivelMaximo([])).toBe('VERDE');
  });

  it('retorna el nivel más alto de la lista', () => {
    const alertas = [
      buildAlerta({ nivel: 'VERDE' }),
      buildAlerta({ nivel: 'ROJO' }),
      buildAlerta({ nivel: 'AMARILLO' }),
    ];
    expect(getNivelMaximo(alertas)).toBe('ROJO');
  });

  it('retorna NARANJA cuando no hay nivel ROJO', () => {
    const alertas = [
      buildAlerta({ nivel: 'AMARILLO' }),
      buildAlerta({ nivel: 'NARANJA' }),
      buildAlerta({ nivel: 'VERDE' }),
    ];
    expect(getNivelMaximo(alertas)).toBe('NARANJA');
  });
});
