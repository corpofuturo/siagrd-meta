import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/supabase.js', () => {
    const terminal = {
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const chain = {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          gt: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          limit: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
          ...terminal,
    };
    return {
          supabaseAdmin: {
                  from: vi.fn().mockReturnValue(chain),
                  rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
          },
    };
});

// Por defecto el middleware inyecta un usuario CDGRD
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
import { supabaseAdmin } from '../lib/supabase.js';
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

           const mockFrom = supabaseAdmin.from as any;
          mockFrom.mockReturnValueOnce({
                  select: vi.fn().mockReturnThis(),
                  eq: vi.fn().mockReturnThis(),
                  single: vi.fn().mockResolvedValue({
                            data: { id: 'inc-1', municipio_id: 'muni-99999' },
                            error: null,
                  }),
          });

           const app = await buildApp();
          const response = await app.inject({
                  method: 'GET',
                  url: '/api/v1/incidentes/inc-1',
                  headers: { authorization: 'Bearer mock-token' },
          });

           expect(response.statusCode).toBe(403);
    });

           it('retorna 404 cuando el incidente no existe', async () => {
                 const mockFrom = supabaseAdmin.from as any;
                 mockFrom.mockReturnValueOnce({
                         select: vi.fn().mockReturnThis(),
                         eq: vi.fn().mockReturnThis(),
                         single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
                 });

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

                  const mockFrom = supabaseAdmin.from as any;
                 mockFrom.mockReturnValueOnce({
                         insert: vi.fn().mockReturnThis(),
                         select: vi.fn().mockReturnThis(),
                         single: vi.fn().mockResolvedValue({
                                   data: { id: 'inc-nuevo', tipo_amenaza: 'INUNDACION' },
                                   error: null,
                         }),
                 });

                  const app = await buildApp();
                 const response = await app.inject({
                         method: 'POST',
                         url: '/api/v1/incidentes',
                         headers: { authorization: 'Bearer mock-token' },
                         payload: { tipo_amenaza: 'INUNDACION', descripcion: 'Desbordamiento río' },
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
          const mockFrom = supabaseAdmin.from as any;
          // Primera llamada: obtener incidente
           mockFrom.mockReturnValueOnce({
                   select: vi.fn().mockReturnThis(),
                   eq: vi.fn().mockReturnThis(),
                   single: vi.fn().mockResolvedValue({
                             data: { municipio_id: 'muni-50001', reportado_por: 'other-user' },
                             error: null,
                   }),
           });
          // Segunda llamada: actualizar incidente
           mockFrom.mockReturnValueOnce({
                   update: vi.fn().mockReturnThis(),
                   eq: vi.fn().mockReturnThis(),
                   select: vi.fn().mockReturnThis(),
                   single: vi.fn().mockResolvedValue({
                             data: { id: 'inc-1', estado: 'ATENDIDO' },
                             error: null,
                   }),
           });

           const app = await buildApp();
          const response = await app.inject({
                  method: 'PATCH',
                  url: '/api/v1/incidentes/inc-1',
                  headers: { authorization: 'Bearer mock-token' },
                  payload: { estado: 'ATENDIDO' },
          });

           expect(response.statusCode).toBe(200);
    });

           it('retorna 403 cuando usuario CIUDADANO intenta actualizar', async () => {
                 (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
                         req.user = { id: 'user-ciu', email: 'ciudadano@test.com', rol: 'CIUDADANO', municipio_id: undefined };
                         done?.();
                 });

                  const mockFrom = supabaseAdmin.from as any;
                 mockFrom.mockReturnValueOnce({
                         select: vi.fn().mockReturnThis(),
                         eq: vi.fn().mockReturnThis(),
                         single: vi.fn().mockResolvedValue({
                                   data: { municipio_id: 'muni-50001', reportado_por: 'other-user' },
                                   error: null,
                         }),
                 });

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
