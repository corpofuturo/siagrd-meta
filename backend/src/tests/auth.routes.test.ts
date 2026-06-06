import { describe, it, expect, vi } from 'vitest';

const mockProfile = { id: 'user-1', nombre: 'Test', apellido: 'User', email: 'test@test.com', rol: 'CDGRD', municipio_id: null, organismo_id: null, foto_url: null, activo: true };

vi.mock('../lib/supabase.js', () => {
  const makeAdminChain = (data: any = null) => ({
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
  });

  return {
    supabaseAnon: {
      auth: {
        signInWithPassword: vi.fn(),
        refreshSession: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        getUser: vi.fn(),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
    supabaseAdmin: {
      from: vi.fn().mockImplementation(() => makeAdminChain(mockProfile)),
    },
  };
});

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation((req: any, _reply: any, done: any) => {
    req.user = { id: 'user-1', email: 'test@test.com', rol: 'CDGRD', municipio_id: undefined };
    done?.();
  }),
}));

import Fastify from 'fastify';
import { authRoutes } from '../routes/auth.js';
import { supabaseAnon } from '../lib/supabase.js';
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
    const mockAuth = supabaseAnon.auth as any;
    mockAuth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: { id: 'user-1', email: 'user@test.com' },
        session: { access_token: 'mock-access-token', refresh_token: 'mock-refresh-token', expires_in: 3600 },
      },
      error: null,
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'user@test.com', password: 'secret123', tipo_login: 'password' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.access_token).toBe('mock-access-token');
    expect(body.refresh_token).toBe('mock-refresh-token');
  });

  it('retorna 400 cuando falta tipo_login y password', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it('retorna 401 cuando las credenciales son inválidas', async () => {
    const mockAuth = supabaseAnon.auth as any;
    mockAuth.signInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' },
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'user@test.com', password: 'wrong', tipo_login: 'password' },
    });

    expect(response.statusCode).toBe(401);
  });

  it('retorna 400 cuando falta password con tipo_login password', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'user@test.com', tipo_login: 'password' },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('POST /auth/refresh', () => {
  it('retorna 200 con nuevo access_token cuando refresh_token es válido', async () => {
    const mockAuth = supabaseAnon.auth as any;
    mockAuth.refreshSession.mockResolvedValueOnce({
      data: {
        session: { access_token: 'new-access-token', refresh_token: 'new-refresh-token', expires_in: 3600 },
      },
      error: null,
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refresh_token: 'old-refresh-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.access_token).toBe('new-access-token');
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
    const mockAuth = supabaseAnon.auth as any;
    mockAuth.refreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid refresh token' },
    });

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
    const mockAuth = supabaseAnon.auth as any;
    mockAuth.signOut.mockResolvedValueOnce({ error: null });

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
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    // La ruta retorna { data: profile }
    expect(body.data).toBeDefined();
    expect(body.data.id).toBe('user-1');
    expect(body.data.rol).toBe('CDGRD');
  });
});
