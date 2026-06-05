import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase.js', () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  return {
    supabaseAdmin: { from: vi.fn().mockReturnValue(chain) },
  };
});

vi.mock('../services/notifications.service.js', () => ({
  enviarAlertaPush: vi.fn().mockResolvedValue(undefined),
  initFCM: vi.fn(),
}));

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation((req: any, _reply: any, done: any) => {
    req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
    done?.();
  }),
}));

import Fastify from 'fastify';
import { alertasRoutes } from '../routes/alertas.js';
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
  await app.register(alertasRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

describe('GET /alertas', () => {
  it('retorna 200 con lista de alertas activas (público)', async () => {
    const mockFrom = supabaseAdmin.from as any;
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: 'alerta-1', titulo: 'Alerta Inundación', nivel: 'ROJO', activa: true },
          { id: 'alerta-2', titulo: 'Alerta Sismo', nivel: 'NARANJA', activa: true },
        ],
        error: null,
      }),
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/alertas',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBe(2);
  });

  it('retorna 200 con lista vacía cuando no hay alertas', async () => {
    const mockFrom = supabaseAdmin.from as any;
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/alertas',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('retorna 200 filtrado (parámetro activa=true no afecta ruta pública)', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/alertas?activa=true',
    });

    expect(response.statusCode).toBe(200);
  });
});

describe('POST /alertas', () => {
  beforeEach(() => {
    const { authMiddleware } = require('../middleware/auth.js');
    authMiddleware.mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
      done?.();
    });
  });

  it('retorna 403 cuando usuario es CIUDADANO', async () => {
    const { authMiddleware } = require('../middleware/auth.js');
    authMiddleware.mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-ciu', email: 'ciudadano@test.com', rol: 'CIUDADANO', municipio_id: undefined };
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/alertas',
      headers: { authorization: 'Bearer mock-token' },
      payload: { titulo: 'Nueva alerta', nivel: 'ROJO' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('retorna 201 cuando usuario es CDGRD', async () => {
    const mockFrom = supabaseAdmin.from as any;
    mockFrom.mockReturnValueOnce({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'alerta-nueva', titulo: 'Alerta Inundación', nivel: 'ROJO', activa: false },
        error: null,
      }),
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/alertas',
      headers: { authorization: 'Bearer mock-token' },
      payload: { titulo: 'Alerta Inundación', nivel: 'ROJO', municipios_afectados: ['50001'] },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBe('alerta-nueva');
  });

  it('retorna 403 cuando usuario es CMGRD', async () => {
    const { authMiddleware } = require('../middleware/auth.js');
    authMiddleware.mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cmgrd', email: 'cmgrd@test.com', rol: 'CMGRD', municipio_id: '50001' };
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/alertas',
      headers: { authorization: 'Bearer mock-token' },
      payload: { titulo: 'Alerta test', nivel: 'AMARILLO' },
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('POST /alertas/:id/emitir', () => {
  it('retorna 200 cuando usuario CDGRD emite una alerta existente', async () => {
    const mockFrom = supabaseAdmin.from as any;
    // Primera llamada: buscar alerta
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'alerta-1',
          nivel: 'ROJO',
          titulo: 'Inundación severa',
          municipios_afectados: ['50001'],
          activa: false,
        },
        error: null,
      }),
    });
    // Segunda llamada: actualizar alerta
    mockFrom.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/alertas/alerta-1/emitir',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
  });

  it('retorna 403 cuando usuario SOCORRO intenta emitir', async () => {
    const { authMiddleware } = require('../middleware/auth.js');
    authMiddleware.mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-socorro', email: 'socorro@test.com', rol: 'SOCORRO', municipio_id: '50001' };
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/alertas/alerta-1/emitir',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('retorna 404 cuando la alerta no existe', async () => {
    const mockFrom = supabaseAdmin.from as any;
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/alertas/no-existe/emitir',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(404);
  });
});
