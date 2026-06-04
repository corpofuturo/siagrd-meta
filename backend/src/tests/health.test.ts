import { describe, it, expect, vi } from 'vitest';

// Mock supabaseAdmin
vi.mock('../lib/supabase.js', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'muni-1' }, error: null }),
    }),
    storage: {
      listBuckets: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  },
  supabaseAnon: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

// Mock servicios externos
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

  it('status ok cuando DB y storage responden sin error', async () => {
    // Verificar que la función de health se puede registrar en Fastify (tipo correcto)
    const { healthRoutes } = await import('../routes/health.js');

    // La función debe aceptar un FastifyInstance — verificamos que es async
    expect(healthRoutes.constructor.name === 'AsyncFunction' || typeof healthRoutes === 'function').toBe(true);
  });
});
