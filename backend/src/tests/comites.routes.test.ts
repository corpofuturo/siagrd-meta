import { describe, it, expect, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const mockDb = vi.fn().mockResolvedValue([]);
  (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  return { mockDb };
});

vi.mock('../lib/db.js', () => ({ db: mockDb }));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue('$2b$12$fakehashvalue'),
  },
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue('$2b$12$fakehashvalue'),
}));

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation((req: any, _reply: any, done: any) => {
    req.user = { id: 'user-admin', email: 'admin@test.com', rol: 'ADMIN', municipio_id: undefined };
    done?.();
  }),
}));

import Fastify from 'fastify';
import { comitesRoutes } from '../routes/comites.js';
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
  await app.register(comitesRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

describe('GET /comites/:id/usuarios', () => {
  it('retorna 200 con los miembros del comité (ADMIN)', async () => {
    (mockDb as any).mockResolvedValueOnce([{ id: 'comite-1', lider_id: 'user-lider' }]);
    (mockDb as any).mockResolvedValueOnce([
      { id: 'u1', email: 'u1@test.com', nombre: 'Juan', apellido: 'García', rol: 'CMGRD', activo: true },
    ]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/comites/comite-1/usuarios',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.total).toBe(1);
    expect(body.data[0].email).toBe('u1@test.com');
  });

  it('retorna 404 cuando el comité no existe', async () => {
    (mockDb as any).mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/comites/no-existe/usuarios',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('retorna 403 cuando el usuario no es ADMIN/CDGRD ni líder del comité', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-otro', email: 'otro@test.com', rol: 'CMGRD', municipio_id: undefined };
      done?.();
    });
    (mockDb as any).mockResolvedValueOnce([{ id: 'comite-1', lider_id: 'user-lider' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/comites/comite-1/usuarios',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('POST /comites/:id/usuarios', () => {
  it('retorna 201 y crea el usuario asignado al comité', async () => {
    (mockDb as any).mockResolvedValueOnce([{ id: 'comite-1', lider_id: 'user-lider', municipio_id: 'muni-1' }]);
    (mockDb as any).mockResolvedValueOnce([]); // sin correo existente
    (mockDb as any).mockResolvedValueOnce([
      { id: 'nuevo-user', email: 'nuevo@test.com', nombre: 'Ana', apellido: 'Ruiz', rol: 'CMGRD', comite_id: 'comite-1' },
    ]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/comites/comite-1/usuarios',
      headers: { authorization: 'Bearer mock-token' },
      payload: { email: 'nuevo@test.com', nombre: 'Ana', apellido: 'Ruiz', password: '123456' },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.comite_id).toBe('comite-1');
  });

  it('retorna 400 cuando el correo ya está registrado', async () => {
    (mockDb as any).mockResolvedValueOnce([{ id: 'comite-1', lider_id: 'user-lider', municipio_id: 'muni-1' }]);
    (mockDb as any).mockResolvedValueOnce([{ id: 'ya-existe' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/comites/comite-1/usuarios',
      headers: { authorization: 'Bearer mock-token' },
      payload: { email: 'repetido@test.com', nombre: 'Ana', apellido: 'Ruiz', password: '123456' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('retorna 403 cuando un líder intenta asignar un rol distinto de CMGRD', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-lider', email: 'lider@test.com', rol: 'CMGRD', municipio_id: undefined };
      done?.();
    });
    (mockDb as any).mockResolvedValueOnce([{ id: 'comite-1', lider_id: 'user-lider', municipio_id: 'muni-1' }]);
    (mockDb as any).mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/comites/comite-1/usuarios',
      headers: { authorization: 'Bearer mock-token' },
      payload: { email: 'nuevo@test.com', nombre: 'Ana', apellido: 'Ruiz', password: '123456', rol: 'ADMIN' },
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('DELETE /comites/:id/usuarios/:user_id', () => {
  it('retorna 204 y retira al usuario del comité', async () => {
    (mockDb as any).mockResolvedValueOnce([{ id: 'comite-1', lider_id: 'user-lider' }]);
    (mockDb as any).mockResolvedValueOnce([{ id: 'user-1', comite_id: 'comite-1' }]);
    (mockDb as any).mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/comites/comite-1/usuarios/user-1',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(204);
  });

  it('retorna 404 cuando el usuario no pertenece a ese comité', async () => {
    (mockDb as any).mockResolvedValueOnce([{ id: 'comite-1', lider_id: 'user-lider' }]);
    (mockDb as any).mockResolvedValueOnce([{ id: 'user-1', comite_id: 'otro-comite' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/comites/comite-1/usuarios/user-1',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(404);
  });
});
