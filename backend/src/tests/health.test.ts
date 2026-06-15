import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/ideam.service.js', () => ({
  getStatus: vi.fn().mockReturnValue('mock'),
  getLastCheck: vi.fn().mockReturnValue('2026-06-04T00:00:00.000Z'),
  getAlertas: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/sgc.service.js', () => ({
  getStatus: vi.fn().mockReturnValue('mock'),
  getLastCheck: vi.fn().mockReturnValue('2026-06-04T00:00:00.000Z'),
  getEventosRecientes: vi.fn().mockResolvedValue([]),
}));

describe('health routes', () => {
  it('healthRoutes es función exportada', async () => {
    const mod = await import('../routes/health.js');
    expect(mod.healthRoutes).toBeDefined();
    expect(typeof mod.healthRoutes).toBe('function');
  });

  it('healthRoutes es función async registrable en Fastify', async () => {
    const { healthRoutes } = await import('../routes/health.js');
    expect(typeof healthRoutes).toBe('function');
  });
});
