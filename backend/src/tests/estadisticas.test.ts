import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks hoisted
// ---------------------------------------------------------------------------

const { mockDb } = vi.hoisted(() => {
  const mockDb = vi.fn().mockResolvedValue([]);
  (mockDb as any).array = vi.fn().mockImplementation((arr: any[]) => arr);
  return { mockDb };
});

vi.mock('../lib/db.js', () => ({ db: mockDb }));

vi.mock('../middleware/auth.js', () => ({
  authMiddleware: vi.fn().mockImplementation((req: any, _reply: any, done: any) => {
    req.user = { id: 'user-admin', email: 'admin@test.com', rol: 'ADMIN' };
    done?.();
  }),
  requireRole: vi.fn().mockImplementation((_roles: string[]) =>
    (req: any, reply: any, done: any) => {
      const user = req.user;
      if (!user) return reply.code(401).send({ error: 'No autenticado' });
      if (!_roles.includes(user.rol)) return reply.code(403).send({ error: 'No autorizado' });
      done?.();
    }
  ),
}));

import Fastify from 'fastify';
import { estadisticasRoutes } from '../routes/estadisticas.js';
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
  await app.register(estadisticasRoutes);
  await app.ready();
  return app;
}

const anioActual = new Date().getFullYear();

// ---------------------------------------------------------------------------

describe('GET /estadisticas/resumen', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-admin', email: 'admin@test.com', rol: 'ADMIN' };
      done?.();
    });
  });

  it('retorna estructura esperada con los campos requeridos', async () => {
    const porEstado = [
      { estado: 'CONFIRMADO', total: 5 },
      { estado: 'EN_CURSO', total: 3 },
      { estado: 'CERRADO', total: 12 },
    ];
    const tiempoRespuesta = [{ tiempo_promedio_horas: 2.75 }];
    const organismos = [
      { organismo_email: 'cdgrd@mun.gov.co', acciones: 18 },
    ];
    const municipio = [{ municipio_nombre: 'Medellín', total: 8 }];

    // GET /estadisticas/resumen hace Promise.all con 4 queries
    (mockDb as any)
      .mockResolvedValueOnce(porEstado)
      .mockResolvedValueOnce(tiempoRespuesta)
      .mockResolvedValueOnce(organismos)
      .mockResolvedValueOnce(municipio);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/estadisticas/resumen',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();

    expect(body).toHaveProperty('año', anioActual);
    expect(body).toHaveProperty('total_eventos_año');
    expect(body).toHaveProperty('por_estado');
    expect(body).toHaveProperty('tiempo_respuesta_promedio_horas');
    expect(body).toHaveProperty('organismos_mas_activos');
    expect(body).toHaveProperty('municipio_mas_afectado');

    expect(body.total_eventos_año).toBe(20); // 5+3+12
    expect(body.por_estado['CERRADO']).toBe(12);
    expect(body.tiempo_respuesta_promedio_horas).toBe(2.75);
    expect(body.municipio_mas_afectado.municipio_nombre).toBe('Medellín');
  });

  it('retorna 403 cuando el rol es CIUDADANO', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cit', email: 'cit@test.com', rol: 'CIUDADANO' };
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/estadisticas/resumen',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('GET /estadisticas/por-tipo', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD' };
      done?.();
    });
  });

  it('filtro por año: pasa el año como parámetro y retorna filas agrupadas', async () => {
    const rows = [
      { tipo: 'INUNDACION', mes: 3, año: 2023, total: 4 },
      { tipo: 'INCENDIO',   mes: 7, año: 2023, total: 2 },
    ];
    (mockDb as any).mockResolvedValueOnce(rows);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/estadisticas/por-tipo?año=2023',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.total).toBe(2);
    expect(body.data[0].tipo).toBe('INUNDACION');
    expect(body.data[0].año).toBe(2023);
  });

  it('sin filtro de año usa el año actual', async () => {
    (mockDb as any).mockResolvedValueOnce([]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/estadisticas/por-tipo',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().total).toBe(0);
  });

  it('retorna 403 cuando el rol es SOCORRO', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-socorro', email: 'socorro@test.com', rol: 'SOCORRO' };
      done?.();
    });

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/estadisticas/por-tipo',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(403);
  });
});
