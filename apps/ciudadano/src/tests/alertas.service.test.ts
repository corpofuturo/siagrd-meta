import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const mockFetch = jest.fn();
global.fetch = mockFetch;

const alertasMock = [
  {
    id: 'a1',
    municipio_codigo: '50001',
    nivel: 'ROJO',
    tipo_amenaza: 'INUNDACION',
    titulo: 'Alerta prueba',
    descripcion: 'Desc',
    instrucciones: null,
    activa: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('alertas.service', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('retorna alertas cuando el backend responde', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: alertasMock }) });
    const { getAlertasActivas } = await import('../services/alertas.service');
    const result = await getAlertasActivas();
    expect(result).toHaveLength(1);
    expect(result[0].nivel).toBe('ROJO');
  });

  it('lanza error si el backend falla', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const { getAlertasActivas } = await import('../services/alertas.service');
    await expect(getAlertasActivas()).rejects.toThrow();
  });

  it('retorna array vacío si data es null', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: null }) });
    const { getAlertasActivas } = await import('../services/alertas.service');
    const result = await getAlertasActivas();
    expect(result).toEqual([]);
  });

  it('cache válido evita llamada al backend', async () => {
    const ts = Date.now().toString();
    await AsyncStorage.setItem('@siagrd:alertas_cache_ts', ts);
    await AsyncStorage.setItem('@siagrd:alertas_cache', JSON.stringify(alertasMock));
    const { getAlertasActivas } = await import('../services/alertas.service');
    const result = await getAlertasActivas();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});
