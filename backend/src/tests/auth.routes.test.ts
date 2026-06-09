import { describe, it, expect, vi } from 'vitest';

const mockProfile = {
  id: 'user-1',
  nombre: 'Test',
  apellido: 'User',
  email: 'test@test.com',
  rol: 'CDGRD',
  municipio_id: null,
  organismo_id: null,
  foto_url: null,
  activo: true,
  password_hash: '$2b$12$fakehashvalue',
};

vi.mock('../lib/db.js', () => ({
  db: vi.fn().mockResolvedValue([]),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue('$2b$12$fakehashvalue'),
  },
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue('$2b$12$fakehashvalue'),
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn().mockReturnValue('mock-jwt-token'),
    verify: vi.fn().mockReturnValue({ sub: 'user-1', email: 'test@test.com', type: 'refresh' }),
  },
  sign: vi.fn().mockReturnValue('mock-jwt-token'),
  verify: vi.fn().mockReturnValue({ sub: 'user-1', email: 'test@test.com', type: 'refresh' }),
}));

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation((req: any, _reply: any, done: any) => {
    req.user = { id: 'user-1', email: 'test@test.com', rol: 'CDGRD', municipio_id: undefined };
    done?.();
  }),
}));

import Fastify from 'fastify';
import { authRoutes } from '../routes/auth.js';
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
  await app.register(authRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

describe('POST /auth/login', () => {
  it('retorna 200 con access_token cuando credenciales son válidas', async () => {
    (db as any).mockResolvedValueOnce([mockProfile]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'test@test.com', password: 'secret123' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.access_token).toBeDefined();
    expect(body.refresh_token).toBeDefined();
  });

  it('retorna 400 cuando falta email', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('retorna 401 cuando las credenciales son inválidas (usuario no encontrado)', async () => {
    (db as any).mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'user@test.com', password: 'wrong' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('retorna 400 cuando falta password', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'user@test.com' },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('POST /auth/refresh', () => {
  it('retorna 200 con nuevo access_token cuando refresh_token es válido', async () => {
    (db as any).mockResolvedValueOnce([{ id: 'user-1', email: 'test@test.com' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: 'mock-refresh-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.access_token).toBeDefined();
  });

  it('retorna 400 cuando no se envía refresh_token', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('retorna 401 cuando el refresh_token es inválido', async () => {
    const jwt = await import('jsonwebtoken');
    (jwt.default.verify as any).mockImplementationOnce(() => { throw new Error('invalid token'); });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: 'expired-token' },
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('retorna 200 con message', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.message).toBeDefined();
  });
});

describe('GET /auth/me', () => {
  it('retorna 401 sin token de autorización', async () => {
    (authMiddleware as any).mockImplementationOnce(() => {
      throw new UnauthorizedError('Token requerido');
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
    });

    expect(response.statusCode).toBe(401);
  });

  it('retorna 200 con datos del usuario autenticado', async () => {
    (db as any).mockResolvedValueOnce([mockProfile]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe('user-1');
    expect(body.data.rol).toBe('CDGRD');
  });
});
