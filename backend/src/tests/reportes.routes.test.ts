import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb } = vi.hoisted(() => {
  const mockDb = vi.fn().mockResolvedValue([]);
  (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  return { mockDb };
});

vi.mock('../lib/db.js', () => ({ db: mockDb }));

const mockUser = {
  id: 'user-ciudadano',
  email: 'ciudadano@test.com',
  rol: 'CIUDADANO' as const,
  municipio_id: undefined,
};

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation((req: any, _reply: any, done: any) => {
    req.user = mockUser;
    done?.();
  }),
}));

import Fastify from 'fastify';
import { reportesRoutes } from '../routes/reportes.js';
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
  await app.register(reportesRoutes, { prefix: '/api/v1' });
  await app.ready();
  return app;
}

const REPORTE_VALIDO = {
  tipo_amenaza: 'INCENDIO_FORESTAL',
  latitud: 4.15,
  longitud: -73.6,
  descripcion: 'Humo visible cerca de la vereda',
};

describe('POST /reportes-ciudadanos', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = mockUser;
      done?.();
    });
    mockDb.mockReset();
    (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  });

  it('crea un reporte autenticado y usa la columna reportado_por (no reportante_id)', async () => {
    mockDb.mockResolvedValueOnce([
      { id: 'reporte-1', tipo: 'INCENDIO_FORESTAL', reportado_por: 'user-ciudadano', anonimo: false },
    ]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos',
      headers: { authorization: 'Bearer mock-token' },
      payload: REPORTE_VALIDO,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.id).toBe('reporte-1');

    // La query de INSERT no debe referenciar la columna inexistente reportante_id
    const insertCallSql = mockDb.mock.calls
      .map((call) => (call[0] as TemplateStringsArray)?.join?.(''))
      .find((sql) => sql?.includes('INSERT INTO reportes_ciudadanos'));
    expect(insertCallSql).toBeDefined();
    expect(insertCallSql).not.toContain('reportante_id');
    expect(insertCallSql).toContain('reportado_por');
    expect(insertCallSql).toContain('ST_SetSRID');
  });

  it('crea un reporte anónimo sin token', async () => {
    mockDb.mockResolvedValueOnce([
      { id: 'reporte-2', tipo: 'INUNDACION', anonimo: true, reportado_por: null },
    ]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos',
      payload: { ...REPORTE_VALIDO, tipo_amenaza: 'INUNDACION', anonimo: true },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.anonimo).toBe(true);
  });

  it('rechaza tipo_amenaza inválido con 400', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos',
      payload: { ...REPORTE_VALIDO, tipo_amenaza: 'INCENDIO' },
    });

    expect(response.statusCode).toBe(400);
    expect(mockDb).not.toHaveBeenCalled();
  });

  it('rechaza coordenadas faltantes con 400', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos',
      payload: { tipo_amenaza: 'SISMO', descripcion: 'temblor' },
    });

    expect(response.statusCode).toBe(400);
    expect(mockDb).not.toHaveBeenCalled();
  });

  it('rechaza tipo_amenaza faltante con 400', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos',
      payload: { latitud: 4.1, longitud: -73.6 },
    });

    expect(response.statusCode).toBe(400);
    expect(mockDb).not.toHaveBeenCalled();
  });
});
