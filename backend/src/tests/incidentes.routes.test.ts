import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const mockDb = vi.fn().mockResolvedValue([]);
  (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  return { mockDb };
});

vi.mock('../lib/db.js', () => ({ db: mockDb }));

const mockUser = {
  id: 'user-cdgrd',
  email: 'cdgrd@test.com',
  rol: 'CDGRD' as const,
  municipio_id: undefined,
};

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation((req: any, _reply: any, done: any) => {
    req.user = mockUser;
    done?.();
  }),
}));

import Fastify from 'fastify';
import { incidentesRoutes } from '../routes/incidentes.js';
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
  await app.register(incidentesRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

describe('GET /incidentes', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = mockUser;
      done?.();
    });
    (mockDb as any).mockResolvedValue([]);
  });

  it('usuario CDGRD recibe todos los incidentes sin filtro de municipio', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/incidentes',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('usuario CMGRD con municipio_id recibe incidentes filtrados por municipio', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cmgrd', email: 'cmgrd@test.com', rol: 'CMGRD', municipio_id: 'muni-50001' };
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/incidentes',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
  });

  it('retorna 401 sin token', async () => {
    (authMiddleware as any).mockImplementationOnce(() => {
      throw new UnauthorizedError('Token requerido');
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/incidentes',
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('GET /incidentes/cercanos', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = mockUser;
      done?.();
    });
    (mockDb as any).mockResolvedValue([]);
  });

  it('retorna 400 sin lat/lng', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/incidentes/cercanos',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('retorna 200 con lat/lng válidos', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/incidentes/cercanos?lat=-4.142&lng=-73.636',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.radio_km).toBe(10);
  });

  it('retorna 200 con radio_km personalizado', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/incidentes/cercanos?lat=-4.142&lng=-73.636&radio_km=25',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.radio_km).toBe(25);
  });
});

describe('GET /incidentes/:id', () => {
  it('retorna 403 cuando usuario de otro municipio intenta acceder', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cmgrd', email: 'cmgrd@test.com', rol: 'CMGRD', municipio_id: 'muni-50001' };
      done?.();
    });
    (mockDb as any).mockResolvedValueOnce([{ id: 'inc-1', municipio_id: 'muni-99999' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/incidentes/inc-1',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('retorna 404 cuando el incidente no existe', async () => {
    (mockDb as any).mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/incidentes/no-existe',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('POST /incidentes', () => {
  it('retorna 403 cuando usuario es CIUDADANO', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-ciu', email: 'ciudadano@test.com', rol: 'CIUDADANO', municipio_id: undefined };
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/incidentes',
      headers: { authorization: 'Bearer mock-token' },
      payload: { tipo_amenaza: 'INUNDACION', descripcion: 'Test' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('retorna 201 cuando usuario es SOCORRO', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-socorro', email: 'socorro@test.com', rol: 'SOCORRO', municipio_id: 'muni-50001' };
      done?.();
    });
    (mockDb as any).mockResolvedValueOnce([{ id: 'inc-nuevo', tipo_amenaza: 'INUNDACION' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/incidentes',
      headers: { authorization: 'Bearer mock-token' },
      payload: {
        tipo_amenaza: 'INUNDACION',
        descripcion: 'Desbordamiento río',
        titulo: 'Desbordamiento río test',
        lat: 4.1,
        lng: -73.6,
        nivel_alerta: 'AMARILLO',
        municipio_id: 'muni-50001',
      },
    });

    expect(response.statusCode).toBe(201);
  });

  it('retorna 401 sin token', async () => {
    (authMiddleware as any).mockImplementationOnce(() => {
      throw new UnauthorizedError('Token requerido');
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/incidentes',
      payload: {},
    });

    expect(response.statusCode).toBe(401);
  });
});

describe('PATCH /incidentes/:id', () => {
  it('retorna 200 cuando usuario CDGRD actualiza un incidente', async () => {
    // Primera query: obtener incidente
    (mockDb as any).mockResolvedValueOnce([{ municipio_id: 'muni-50001', reportado_por: 'other-user' }]);
    // Segunda query: actualizar
    (mockDb as any).mockResolvedValueOnce([{ id: 'inc-1', estado: 'EN_CURSO' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/incidentes/inc-1',
      headers: { authorization: 'Bearer mock-token' },
      payload: { estado: 'EN_CURSO' },
    });

    expect(response.statusCode).toBe(200);
  });

  it('retorna 403 cuando usuario CIUDADANO intenta actualizar', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-ciu', email: 'ciudadano@test.com', rol: 'CIUDADANO', municipio_id: undefined };
      done?.();
    });
    (mockDb as any).mockResolvedValueOnce([{ municipio_id: 'muni-50001', reportado_por: 'other-user' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/incidentes/inc-1',
      headers: { authorization: 'Bearer mock-token' },
      payload: { estado: 'ATENDIDO' },
    });

    expect(response.statusCode).toBe(403);
  });
});
