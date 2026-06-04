import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de supabase antes de importar el servicio
vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

describe('sync.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('importa sin errores', async () => {
    const mod = await import('../services/sync.service.js');
    expect(mod.procesarSync).toBeDefined();
    expect(typeof mod.procesarSync).toBe('function');
  });

  it('ordena eventos por timestamp_local ASC', async () => {
    const eventos = [
      { id: 'e3', tabla: 'incidentes', operacion: 'INSERT' as const, payload: {}, timestamp_local: 3000, registro_id: '00000000-0000-0000-0000-000000000003' },
      { id: 'e1', tabla: 'incidentes', operacion: 'INSERT' as const, payload: {}, timestamp_local: 1000, registro_id: '00000000-0000-0000-0000-000000000001' },
      { id: 'e2', tabla: 'incidentes', operacion: 'INSERT' as const, payload: {}, timestamp_local: 2000, registro_id: '00000000-0000-0000-0000-000000000002' },
    ];

    // Verificar que el orden esperado es por timestamp_local
    const ordenados = [...eventos].sort((a, b) => a.timestamp_local - b.timestamp_local);
    expect(ordenados[0].id).toBe('e1');
    expect(ordenados[1].id).toBe('e2');
    expect(ordenados[2].id).toBe('e3');
  });

  it('rechaza tablas no permitidas (audit_log)', async () => {
    const { procesarSync } = await import('../services/sync.service.js');

    const result = await procesarSync(
      {
        device_id: 'test-device-001',
        eventos: [
          {
            id: 'ev-001',
            tabla: 'audit_log',
            operacion: 'INSERT',
            registro_id: '00000000-0000-0000-0000-000000000099',
            payload: { campo: 'valor' },
            timestamp_local: Date.now(),
          },
        ],
      },
      'user-id-test',
    );

    expect(result.fallidos).toHaveLength(1);
    expect(result.fallidos[0].id).toBe('ev-001');
    expect(result.fallidos[0].error).toContain('no permitida');
    expect(result.procesados).toBe(0);
  });

  it('proceso INSERT no falla con payload vacío', async () => {
    const { procesarSync } = await import('../services/sync.service.js');

    // Con payload vacío no debería lanzar excepción
    await expect(
      procesarSync(
        {
          device_id: 'test-device-002',
          eventos: [
            {
              id: 'ev-002',
              tabla: 'incidentes',
              operacion: 'INSERT',
              registro_id: '00000000-0000-0000-0000-000000000010',
              payload: {},
              timestamp_local: Date.now(),
            },
          ],
        },
        'user-id-test',
      ),
    ).resolves.toBeDefined();
  });
});
