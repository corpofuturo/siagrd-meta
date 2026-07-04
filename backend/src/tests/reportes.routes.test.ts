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

  it('acepta foto_url propia de /archivos/static y la incluye en el INSERT', async () => {
    const fotoUrl = `${process.env.PUBLIC_BASE_URL ?? ''}/api/v1/archivos/static/reporte-3.jpg`;
    mockDb.mockResolvedValueOnce([
      { id: 'reporte-3', tipo: 'INCENDIO_FORESTAL', foto_url: fotoUrl },
    ]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos',
      payload: { ...REPORTE_VALIDO, foto_url: fotoUrl, anonimo: true },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.foto_url).toBe(fotoUrl);
  });

  it('rechaza foto_url que no proviene de /archivos/upload con 400', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos',
      payload: { ...REPORTE_VALIDO, foto_url: 'https://evil.example.com/tracker.jpg', anonimo: true },
    });

    expect(response.statusCode).toBe(400);
    expect(mockDb).not.toHaveBeenCalled();
  });

  it('crea un reporte sin municipio_id (opcional)', async () => {
    mockDb.mockResolvedValueOnce([
      { id: 'reporte-4', tipo: 'INCENDIO_FORESTAL', municipio_id: null },
    ]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos',
      payload: { ...REPORTE_VALIDO, anonimo: true },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.municipio_id).toBeNull();
  });

  it('rechaza latitud fuera de rango con 400', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos',
      payload: { ...REPORTE_VALIDO, latitud: 200 },
    });

    expect(response.statusCode).toBe(400);
    expect(mockDb).not.toHaveBeenCalled();
  });
});

describe('GET /reportes-ciudadanos', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
      done?.();
    });
    mockDb.mockReset();
    (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  });

  it('retorna 200 con lista de reportes para rol autorizado', async () => {
    // La query real compone fragmentos db`` anidados para los filtros opcionales
    // (estado/municipio) antes del SELECT final; con mockDb simulando el tag
    // como función simple, cada fragmento anidado también consume una resolución.
    // Se usa un default persistente para que tanto los fragmentos como la
    // consulta real devuelvan el mismo arreglo.
    mockDb.mockResolvedValue([{ id: 'reporte-1' }, { id: 'reporte-2' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reportes-ciudadanos',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.total).toBe(2);
  });

  it('retorna 403 cuando el rol es CIUDADANO', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = mockUser;
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reportes-ciudadanos',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('rechaza estado inválido con 400', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reportes-ciudadanos?estado=ATENDIDO',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('PATCH /reportes-ciudadanos/:id', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
      done?.();
    });
    mockDb.mockReset();
    (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  });

  it('actualiza el estado de un reporte existente (200)', async () => {
    // La ruta compone el SET dinámicamente con db(columna) y sets.reduce(),
    // lo que genera varias invocaciones intermedias de db`` además de la
    // consulta SELECT inicial y el UPDATE final. Se fija el resultado de la
    // primera llamada (existencia del reporte) y se usa un default
    // persistente para el resto (fragmentos intermedios + UPDATE real).
    mockDb.mockResolvedValueOnce([{ id: 'reporte-1', estado: 'PENDIENTE', municipio_id: 'muni-1' }]);
    mockDb.mockResolvedValue([{ id: 'reporte-1', estado: 'REVISADO' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/reportes-ciudadanos/reporte-1',
      headers: { authorization: 'Bearer mock-token' },
      payload: { estado: 'REVISADO' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().estado).toBe('REVISADO');
  });

  it('retorna 403 cuando el rol es CIUDADANO', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = mockUser;
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/reportes-ciudadanos/reporte-1',
      headers: { authorization: 'Bearer mock-token' },
      payload: { estado: 'REVISADO' },
    });

    expect(response.statusCode).toBe(403);
    expect(mockDb).not.toHaveBeenCalled();
  });

  it('retorna 404 cuando el reporte no existe', async () => {
    mockDb.mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/reportes-ciudadanos/no-existe',
      headers: { authorization: 'Bearer mock-token' },
      payload: { estado: 'REVISADO' },
    });

    expect(response.statusCode).toBe(404);
  });

  it('rechaza estado inválido con 400', async () => {
    mockDb.mockResolvedValueOnce([{ id: 'reporte-1', estado: 'PENDIENTE', municipio_id: 'muni-1' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/reportes-ciudadanos/reporte-1',
      headers: { authorization: 'Bearer mock-token' },
      payload: { estado: 'ATENDIDO' },
    });

    expect(response.statusCode).toBe(400);
  });

  it('rechaza body sin campos actualizables con 400', async () => {
    mockDb.mockResolvedValueOnce([{ id: 'reporte-1', estado: 'PENDIENTE', municipio_id: 'muni-1' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/reportes-ciudadanos/reporte-1',
      headers: { authorization: 'Bearer mock-token' },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('POST /reportes-ciudadanos/:id/corroborar', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
      done?.();
    });
    mockDb.mockReset();
    (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  });

  it('registra una corroboración confirmada y devuelve 201', async () => {
    // 1: SELECT reporte, 2: SELECT perfil, 3: INSERT corroboracion, 4: UPDATE estado
    mockDb.mockResolvedValueOnce([{ id: 'reporte-1', estado: 'PENDIENTE', municipio_id: 'muni-1' }]);
    mockDb.mockResolvedValueOnce([{ comite_id: 'comite-1' }]);
    mockDb.mockResolvedValueOnce([{ id: 'corr-1', confirmado: true }]);
    mockDb.mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos/reporte-1/corroborar',
      headers: { authorization: 'Bearer mock-token' },
      payload: { confirmado: true, observaciones: 'Visto en terreno' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().id).toBe('corr-1');
  });

  it('retorna 400 cuando falta el campo confirmado', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos/reporte-1/corroborar',
      headers: { authorization: 'Bearer mock-token' },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(mockDb).not.toHaveBeenCalled();
  });

  it('retorna 403 cuando el rol es CIUDADANO', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = mockUser;
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos/reporte-1/corroborar',
      headers: { authorization: 'Bearer mock-token' },
      payload: { confirmado: true },
    });

    expect(response.statusCode).toBe(403);
    expect(mockDb).not.toHaveBeenCalled();
  });

  it('retorna 404 cuando el reporte no existe', async () => {
    mockDb.mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/reportes-ciudadanos/no-existe/corroborar',
      headers: { authorization: 'Bearer mock-token' },
      payload: { confirmado: true },
    });

    expect(response.statusCode).toBe(404);
  });
});

describe('GET /reportes-ciudadanos/:id/corroboraciones', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD', municipio_id: undefined };
      done?.();
    });
    mockDb.mockReset();
    (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  });

  it('retorna 200 con la lista de corroboraciones', async () => {
    mockDb.mockResolvedValueOnce([{ id: 'reporte-1', municipio_id: 'muni-1' }]);
    mockDb.mockResolvedValueOnce([{ id: 'corr-1' }]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reportes-ciudadanos/reporte-1/corroboraciones',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().total).toBe(1);
  });

  it('retorna 403 cuando el rol es CIUDADANO', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = mockUser;
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reportes-ciudadanos/reporte-1/corroboraciones',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(403);
    expect(mockDb).not.toHaveBeenCalled();
  });

  it('retorna 404 cuando el reporte no existe', async () => {
    mockDb.mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/reportes-ciudadanos/no-existe/corroboraciones',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(404);
  });
});
