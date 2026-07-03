import { describe, it, expect, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const mockDb = vi.fn().mockResolvedValue([]);
  return { mockDb };
});

vi.mock('../lib/db.js', () => ({ db: mockDb }));

import Fastify from 'fastify';
import { geoRoutes } from '../routes/geo.js';

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(geoRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

describe('GET /geo/departamento', () => {
  it('retorna 200 sin autenticacion con el contrato esperado', async () => {
    (mockDb as any).mockResolvedValueOnce([
      { id: 'm1', nombre: 'Villavicencio', codigo_dane: '50001', geojson: { type: 'Polygon', coordinates: [] } },
    ]);

    const app = await buildApp();
    const response = await app.inject({ method: 'GET', url: '/api/v1/geo/departamento' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.departamento).toBe('Meta');
    expect(Array.isArray(body.municipios)).toBe(true);
    expect(body.municipios[0].nombre).toBe('Villavicencio');
  });
});
