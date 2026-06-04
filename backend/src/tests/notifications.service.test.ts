import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));

describe('notifications.service', () => {
  it('initFCM no lanza si FIREBASE_PROJECT_ID no está configurado', async () => {
    const { initFCM } = await import('../services/notifications.service.js');
    expect(() => initFCM()).not.toThrow();
  });

  it('enviarAlertaPush no lanza si no hay tokens (sin perfiles en municipios)', async () => {
    const { enviarAlertaPush } = await import('../services/notifications.service.js');
    await expect(
      enviarAlertaPush(
        '00000000-0000-0000-0000-000000000001',
        'AMARILLO',
        'Alerta de prueba',
        ['00000000-0000-0000-0000-000000000002'],
      )
    ).resolves.not.toThrow();
  });

  it('exporta initFCM y enviarAlertaPush', async () => {
    const mod = await import('../services/notifications.service.js');
    expect(typeof mod.initFCM).toBe('function');
    expect(typeof mod.enviarAlertaPush).toBe('function');
  });
});
