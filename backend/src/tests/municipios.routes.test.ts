import { describe, it, expect, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const mockDb = vi.fn().mockResolvedValue([]);
  (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  return { mockDb };
});

vi.mock('../lib/db.js', () => ({ db: mockDb }));

vi.mock('../middleware/cache.js', () => ({
  getCached: vi.fn().mockReturnValue(null),
  setCached: vi.fn(),
}));

import Fastify from 'fastify';
import { municipiosRoutes } from '../routes/municipios.js';

async function buildApp() {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    reply.status((error as any).statusCode ?? 500).send({
      error: error.name,
      message: error.message,
    });
  });
  await app.register(municipiosRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

describe('GET /municipios', () => {
  it('retorna lista de municipios (público)', async () => {
    (mockDb as any).mockResolvedValueOnce([
      { id: 'm1', nombre: 'Villavicencio', codigo_dane: '50001' },
      { id: 'm2', nombre: 'Acacías', codigo_dane: '50006' },
    ]);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/municipios' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBe(2);
  });

  it('retorna lista vacía cuando no hay municipios', async () => {
    (mockDb as any).mockResolvedValueOnce([]);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/municipios' });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });
});

describe('GET /municipios/:id', () => {
  it('retorna detalle con incidentes activos', async () => {
    (mockDb as any).mockResolvedValueOnce([{ id: 'm1', nombre: 'Villavicencio', codigo_dane: '50001' }]);
    (mockDb as any).mockResolvedValueOnce([
      { id: 'inc-1', titulo: 'Inundación zona baja', estado: 'ACTIVO' },
    ]);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/municipios/m1' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.nombre).toBe('Villavicencio');
    expect(Array.isArray(body.data.incidentes_activos)).toBe(true);
  });

  it('retorna 404 cuando municipio no existe', async () => {
    (mockDb as any).mockResolvedValueOnce([]);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/municipios/no-existe' });
    expect(res.statusCode).toBe(404);
  });
});
