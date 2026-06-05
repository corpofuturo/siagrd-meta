import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase.js', () => {
  const countChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: null, error: null, count: 0 }),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  return {
    supabaseAdmin: { from: vi.fn().mockReturnValue(countChain) },
  };
});

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation((req: any, _reply: any, done: any) => {
    req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
    done?.();
  }),
}));

import Fastify from 'fastify';
import { dashboardRoutes } from '../routes/dashboard.js';
import { supabaseAdmin } from '../lib/supabase.js';

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
    const { authMiddleware } = require('../middleware/auth.js');
    authMiddleware.mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
      done?.();
    });
  });

  it('retorna 200 con las 6 métricas cuando usuario es CDGRD', async () => {
    const mockFrom = supabaseAdmin.from as any;
    const makeCountChain = (count: number) => ({
      select: vi.fn().mockResolvedValue({ data: null, error: null, count }),
      eq: vi.fn().mockReturnThis(),
    });

    // 6 llamadas — una por cada métrica
    mockFrom
      .mockReturnValueOnce(makeCountChain(5))  // incidentes
      .mockReturnValueOnce(makeCountChain(2))  // alertas activas
      .mockReturnValueOnce(makeCountChain(10)) // reportes
      .mockReturnValueOnce(makeCountChain(3))  // damnificados
      .mockReturnValueOnce(makeCountChain(8))  // recursos
      .mockReturnValueOnce(makeCountChain(1)); // sync_events

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
    expect(body).toHaveProperty('reportes_ciudadanos');
    expect(body).toHaveProperty('damnificados_registrados');
    expect(body).toHaveProperty('recursos_disponibles');
    expect(body).toHaveProperty('eventos_sync_pendientes');
  });

  it('retorna 403 cuando usuario es CMGRD', async () => {
    const { authMiddleware } = require('../middleware/auth.js');
    authMiddleware.mockImplementationOnce((req: any, _reply: any, done: any) => {
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
    const { authMiddleware } = require('../middleware/auth.js');
    const { UnauthorizedError } = require('../utils/errors.js');
    authMiddleware.mockImplementationOnce(() => {
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
    const { authMiddleware } = require('../middleware/auth.js');
    authMiddleware.mockImplementationOnce((req: any, _reply: any, done: any) => {
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
    const { authMiddleware } = require('../middleware/auth.js');
    authMiddleware.mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
      done?.();
    });
  });

  it('retorna 200 con incidentes, alertas y reportes cuando usuario es CDGRD', async () => {
    const mockFrom = supabaseAdmin.from as any;
    const makeDataChain = (data: any[]) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data, error: null }),
    });

    mockFrom
      .mockReturnValueOnce(makeDataChain([{ id: 'inc-1' }]))    // incidentes
      .mockReturnValueOnce(makeDataChain([{ id: 'alerta-1' }])) // alertas
      .mockReturnValueOnce(makeDataChain([{ id: 'rep-1' }]));   // reportes

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
    const { authMiddleware } = require('../middleware/auth.js');
    authMiddleware.mockImplementationOnce((req: any, _reply: any, done: any) => {
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
    const { authMiddleware } = require('../middleware/auth.js');
    const { UnauthorizedError } = require('../utils/errors.js');
    authMiddleware.mockImplementationOnce(() => {
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
