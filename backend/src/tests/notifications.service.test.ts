import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/db.js', () => ({
  db: Object.assign(vi.fn().mockResolvedValue([]), { array: vi.fn((a: unknown[]) => a) }),
}));

vi.mock('../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('notifications.service', () => {
  it('enviarAlertaPush no lanza', async () => {
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

  it('exporta enviarAlertaPush y processNotificationQueue', async () => {
    const mod = await import('../services/notifications.service.js');
    expect(typeof mod.enviarAlertaPush).toBe('function');
    expect(typeof mod.processNotificationQueue).toBe('function');
  });
});
