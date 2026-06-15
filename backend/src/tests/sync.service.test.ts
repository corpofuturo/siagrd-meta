import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/db.js', () => {
  const mockDb = vi.fn().mockResolvedValue([]);
  (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  (mockDb as any).json = vi.fn().mockImplementation((v: any) => v);
  (mockDb as any).unsafe = vi.fn().mockImplementation((s: string) => s);
  const tag = Object.assign(mockDb, { __esModule: true });
  return { db: tag };
});

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('sync.service', () => {
  it('exporta procesarSync como función', async () => {
    const mod = await import('../services/sync.service.js');
    expect(typeof mod.procesarSync).toBe('function');
  });

  it('ordena eventos por timestamp_local ASC', () => {
    const eventos = [
      { id: 'e3', timestamp_local: 3000 },
      { id: 'e1', timestamp_local: 1000 },
      { id: 'e2', timestamp_local: 2000 },
    ];
    const ordenados = [...eventos].sort((a, b) => a.timestamp_local - b.timestamp_local);
    expect(ordenados.map(e => e.id)).toEqual(['e1', 'e2', 'e3']);
  });

  it('rechaza tablas no permitidas (audit_log)', async () => {
    const { procesarSync } = await import('../services/sync.service.js');
    const result = await procesarSync(
      {
        device_id: 'test-device-001',
        eventos: [{
          id: 'ev-001',
          tabla: 'audit_log',
          operacion: 'INSERT',
          registro_id: '00000000-0000-0000-0000-000000000099',
          payload: { campo: 'valor' },
          timestamp_local: 1000000,
        }],
      },
      'user-id-test',
    );
    expect(result.fallidos).toHaveLength(1);
    expect(result.fallidos[0].id).toBe('ev-001');
    expect(result.fallidos[0].error).toContain('no permitida');
    expect(result.procesados).toBe(0);
  }, 10000);

  it('procesa lista vacía de eventos sin errores', async () => {
    const { procesarSync } = await import('../services/sync.service.js');
    const result = await procesarSync(
      { device_id: 'test-device-002', eventos: [] },
      'user-id-test',
    );
    expect(result.procesados).toBe(0);
    expect(result.fallidos).toHaveLength(0);
    expect(result.server_timestamp).toBeTypeOf('number');
  }, 10000);
});
