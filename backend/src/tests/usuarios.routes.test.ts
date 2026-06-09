import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const mockDb = vi.fn().mockResolvedValue([]);
  (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  return { mockDb };
});

vi.mock('../lib/db.js', () => ({ db: mockDb }));

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation((req: any, _reply: any, done: any) => {
    req.user = { id: 'admin-1', email: 'admin@test.com', rol: 'ADMIN', municipio_id: undefined };
    done?.();
  }),
}));

import Fastify from 'fastify';
import { usuariosRoutes } from '../routes/usuarios.js';
import { authMiddleware } from '../middleware/auth.js';

async function buildApp() {
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    reply.status((error as any).statusCode ?? 500).send({
      error: error.name,
      message: error.message,
    });
  });
  await app.register(usuariosRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

describe('GET /usuarios', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'admin-1', email: 'admin@test.com', rol: 'ADMIN', municipio_id: undefined };
      done?.();
    });
    (mockDb as any).mockResolvedValue([]);
  });

  it('ADMIN puede listar usuarios', async () => {
    (mockDb as any).mockResolvedValueOnce([
      { id: 'u1', email: 'a@test.com', rol: 'CDGRD' },
      { id: 'u2', email: 'b@test.com', rol: 'CMGRD' },
    ]);
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/usuarios', headers: { authorization: 'Bearer tok' } });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.total).toBe(2);
  });

  it('CIUDADANO recibe 403', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'u-ciu', email: 'ciu@test.com', rol: 'CIUDADANO', municipio_id: undefined };
      done?.();
    });
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/usuarios', headers: { authorization: 'Bearer tok' } });
    expect(res.statusCode).toBe(403);
  });
});

describe('PATCH /usuarios/:id/rol', () => {
  it('ADMIN puede cambiar rol', async () => {
    (mockDb as any).mockResolvedValueOnce([{ id: 'u1', email: 'x@test.com', nombre: 'X', apellido: 'Y', rol: 'CMGRD' }]);
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/usuarios/u1/rol',
      headers: { authorization: 'Bearer tok' },
      payload: { rol: 'CMGRD' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.rol).toBe('CMGRD');
  });

  it('rol inválido retorna 400', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/usuarios/u1/rol',
      headers: { authorization: 'Bearer tok' },
      payload: { rol: 'SUPERUSUARIO' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('CDGRD no puede cambiar rol (403)', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'cdgrd-1', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
      done?.();
    });
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/usuarios/u1/rol',
      headers: { authorization: 'Bearer tok' },
      payload: { rol: 'CMGRD' },
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('PATCH /usuarios/:id/activo', () => {
  it('ADMIN puede desactivar usuario', async () => {
    (mockDb as any).mockResolvedValueOnce([{ id: 'u1', email: 'x@test.com', nombre: 'X', apellido: 'Y', activo: false }]);
    const app = await buildApp();
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/usuarios/u1/activo',
      headers: { authorization: 'Bearer tok' },
      payload: { activo: false },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.activo).toBe(false);
  });
});
