import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/db.js', () => ({
  db: vi.fn().mockResolvedValue([{ n: 0, total: 0 }]),
}));

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation((req: any, _reply: any, done: any) => {
    req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
    done?.();
  }),
}));

import Fastify from 'fastify';
import { dashboardRoutes } from '../routes/dashboard.js';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { UnauthorizedError } from '../utils/errors.js';

async function buildApp() {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    reply.status((error as any).statusCode ?? 500).send({
      error: error.name,
      message: error.message,
      code: (error as any).code,
    });
  });
  await app.register(dashboardRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

describe('GET /dashboard/stats', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
      done?.();
    });
    (db as any).mockResolvedValue([{ n: 0, total: 0, nivel_alerta: 'ROJO', count: 0 }]);
  });

  it('retorna 200 con métricas cuando usuario es CDGRD', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/stats',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('incidentes_activos');
    expect(body).toHaveProperty('alertas_activas');
    expect(body).toHaveProperty('reportes_pendientes');
    expect(body).toHaveProperty('damnificados_total');
    expect(body).toHaveProperty('recursos_disponibles');
    expect(body).toHaveProperty('por_nivel_alerta');
    expect(body).toHaveProperty('timestamp');
  });

  it('retorna 403 cuando usuario es CMGRD', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cmgrd', email: 'cmgrd@test.com', rol: 'CMGRD', municipio_id: '50001' };
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/stats',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('retorna 401 sin token de autorización', async () => {
    (authMiddleware as any).mockImplementationOnce(() => {
      throw new UnauthorizedError('Token requerido');
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/stats',
    });

    expect(response.statusCode).toBe(401);
  });

  it('retorna 403 cuando usuario es CIUDADANO', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-ciu', email: 'ciu@test.com', rol: 'CIUDADANO', municipio_id: undefined };
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/stats',
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('GET /dashboard/mapa-datos', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
      done?.();
    });
    (db as any).mockResolvedValue([]);
  });

  it('retorna 200 con incidentes, alertas y reportes cuando usuario es CDGRD', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/mapa-datos',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('incidentes');
    expect(body).toHaveProperty('alertas');
    expect(body).toHaveProperty('reportes');
    expect(Array.isArray(body.incidentes)).toBe(true);
    expect(Array.isArray(body.alertas)).toBe(true);
    expect(Array.isArray(body.reportes)).toBe(true);
  });

  it('retorna 403 cuando usuario es CMGRD', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cmgrd', email: 'cmgrd@test.com', rol: 'CMGRD', municipio_id: '50001' };
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/mapa-datos',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('retorna 401 sin token', async () => {
    (authMiddleware as any).mockImplementationOnce(() => {
      throw new UnauthorizedError('Token requerido');
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/dashboard/mapa-datos',
    });

    expect(response.statusCode).toBe(401);
  });
});
