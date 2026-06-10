import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const mockDb = vi.fn().mockResolvedValue([]);
  (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  return { mockDb };
});

vi.mock('../lib/db.js', () => ({ db: mockDb }));

// requireRole: returns a preHandler that passes through by default (ADMIN mock)
// Tests that need 401/403 override authMiddleware to set a non-ADMIN role
vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation((req: any, _reply: any, done: any) => {
    req.user = { id: 'user-admin', email: 'admin@test.com', rol: 'ADMIN' };
    done?.();
  }),
  requireRole: vi.fn().mockImplementation((_roles: string[]) =>
    (req: any, reply: any, done: any) => {
      const user = req.user;
      if (!user) {
        return reply.code(401).send({ error: 'No autenticado' });
      }
      if (!_roles.includes(user.rol)) {
        return reply.code(403).send({ error: 'No autorizado' });
      }
      done?.();
    }
  ),
}));

import Fastify from 'fastify';
import { webhooksRoutes } from '../routes/webhooks.js';
import { authMiddleware } from '../middleware/auth.js';

async function buildApp() {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    reply.status((error as any).statusCode ?? 500).send({
      error: error.name,
      message: error.message,
      code: (error as any).code,
    });
  });
  await app.register(webhooksRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

describe('POST /api/v1/webhooks/registrar', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-admin', email: 'admin@test.com', rol: 'ADMIN' };
      done?.();
    });
    (mockDb as any).mockResolvedValue([]);
  });

  it('crea webhook correctamente y retorna 201', async () => {
    const created = {
      id: 'wh-1',
      url: 'https://example.com/hook',
      eventos: ['alerta.emitida'],
      municipio_id: null,
      descripcion: 'Hook de prueba',
      activo: true,
      creado_por: 'user-admin',
    };
    (mockDb as any).mockResolvedValueOnce([created]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/registrar',
      headers: { authorization: 'Bearer mock-token' },
      payload: {
        url: 'https://example.com/hook',
        eventos: ['alerta.emitida'],
        descripcion: 'Hook de prueba',
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBe('wh-1');
    expect(body.url).toBe('https://example.com/hook');
  });

  it('retorna 403 cuando el usuario no es ADMIN', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD' };
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/registrar',
      headers: { authorization: 'Bearer mock-token' },
      payload: {
        url: 'https://example.com/hook',
        eventos: ['alerta.emitida'],
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('retorna 401 cuando no hay usuario autenticado', async () => {
    (authMiddleware as any).mockImplementationOnce((_req: any, reply: any, _done: any) => {
      reply.code(401).send({ error: 'Token requerido' });
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/registrar',
      payload: {
        url: 'https://example.com/hook',
        eventos: ['alerta.emitida'],
      },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('GET /api/v1/webhooks', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-admin', email: 'admin@test.com', rol: 'ADMIN' };
      done?.();
    });
  });

  it('retorna 200 con lista de webhooks', async () => {
    const rows = [
      { id: 'wh-1', url: 'https://a.com/hook', eventos: ['alerta.emitida'], activo: true },
      { id: 'wh-2', url: 'https://b.com/hook', eventos: ['incidente.creado'], activo: false },
    ];
    (mockDb as any).mockResolvedValueOnce(rows);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/webhooks',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body[0].id).toBe('wh-1');
  });

  it('retorna 200 con array vacío cuando no hay webhooks', async () => {
    (mockDb as any).mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/webhooks',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });
});

describe('DELETE /api/v1/webhooks/:id', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-admin', email: 'admin@test.com', rol: 'ADMIN' };
      done?.();
    });
  });

  it('desactiva el webhook y retorna { ok: true }', async () => {
    (mockDb as any).mockResolvedValueOnce([{ id: 'wh-1' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/webhooks/wh-1',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it('retorna 404 cuando el webhook no existe', async () => {
    (mockDb as any).mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/webhooks/no-existe',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'Webhook no encontrado' });
  });
});

describe('POST /api/v1/webhooks/test/:id', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-admin', email: 'admin@test.com', rol: 'ADMIN' };
      done?.();
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ping exitoso — retorna ok: true con status_code del destino', async () => {
    (mockDb as any).mockResolvedValueOnce([{ id: 'wh-1', url: 'https://example.com/hook' }]);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }));

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/test/wh-1',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.status_code).toBe(200);
  });

  it('ping fallido — retorna ok: false con mensaje de error cuando fetch lanza', async () => {
    (mockDb as any).mockResolvedValueOnce([{ id: 'wh-1', url: 'https://example.com/hook' }]);

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/test/wh-1',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('ECONNREFUSED');
  });

  it('retorna 404 cuando el webhook no existe', async () => {
    (mockDb as any).mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/webhooks/test/no-existe',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: 'Webhook no encontrado' });
  });
});
