import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks hoisted — misma estructura que webhooks.test.ts
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
import { chatRoutes } from '../routes/chat.js';
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
  await app.register(chatRoutes);
  await app.ready();
  return app;
}

// ---------------------------------------------------------------------------

describe('GET /chats/:id/mensajes', () => {
  beforeEach(() => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD' };
      done?.();
    });
    (mockDb as any).mockResolvedValue([]);
  });

  it('CIUDADANO recibe 403 intentando leer chat OPERATIVO_EVENTO', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = {
        id: 'user-cit',
        email: 'cit@test.com',
        rol: 'CIUDADANO',
        municipio_id: 'mun-1',
      };
      done?.();
    });

    // El chat existe pero es OPERATIVO_EVENTO
    (mockDb as any).mockResolvedValueOnce([
      { id: 'chat-op-1', tipo: 'OPERATIVO_EVENTO', municipio_id: 'mun-1' },
    ]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/chats/chat-op-1/mensajes',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(403);
  });

  it('CDGRD puede leer chat OPERATIVO_EVENTO y retorna mensajes', async () => {
    const mensajes = [
      {
        id: 'msg-1',
        chat_id: 'chat-op-1',
        autor_id: 'user-cdgrd',
        tipo: 'TEXTO',
        contenido: 'En camino',
        metadata: null,
        created_at: new Date().toISOString(),
        nombre: 'Juan',
        apellido: 'Pérez',
        autor_rol: 'CDGRD',
      },
    ];

    (mockDb as any)
      .mockResolvedValueOnce([{ id: 'chat-op-1', tipo: 'OPERATIVO_EVENTO', municipio_id: 'mun-1' }])
      .mockResolvedValueOnce(mensajes);

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/chats/chat-op-1/mensajes',
      headers: { authorization: 'Bearer mock-token' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].contenido).toBe('En camino');
  });
});

describe('POST /chats/:id/mensajes — control de tipo ALERTA_OFICIAL', () => {
  beforeEach(() => {
    (mockDb as any).mockResolvedValue([]);
  });

  it('Solo CDGRD puede enviar ALERTA_OFICIAL', async () => {
    (authMiddleware as any).mockImplementation((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-cdgrd', email: 'cdgrd@test.com', rol: 'CDGRD' };
      done?.();
    });

    const mensajeCreado = {
      id: 'msg-alerta',
      chat_id: 'chat-pub-1',
      autor_id: 'user-cdgrd',
      tipo: 'ALERTA_OFICIAL',
      contenido: 'Evacuación inmediata sector norte',
      metadata: null,
      created_at: new Date().toISOString(),
    };

    (mockDb as any)
      .mockResolvedValueOnce([{ id: 'chat-pub-1', tipo: 'PUBLICO_EVENTO', municipio_id: 'mun-1' }])
      .mockResolvedValueOnce([mensajeCreado]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/chats/chat-pub-1/mensajes',
      headers: { authorization: 'Bearer mock-token' },
      payload: { contenido: 'Evacuación inmediata sector norte', tipo: 'ALERTA_OFICIAL' },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data.tipo).toBe('ALERTA_OFICIAL');
  });

  it('SOCORRO no puede enviar ALERTA_OFICIAL — retorna 403', async () => {
    (authMiddleware as any).mockImplementationOnce((req: any, _reply: any, done: any) => {
      req.user = { id: 'user-socorro', email: 'socorro@test.com', rol: 'SOCORRO' };
      done?.();
    });

    (mockDb as any).mockResolvedValueOnce([
      { id: 'chat-pub-1', tipo: 'PUBLICO_EVENTO', municipio_id: 'mun-1' },
    ]);

    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/chats/chat-pub-1/mensajes',
      headers: { authorization: 'Bearer mock-token' },
      payload: { contenido: 'Alerta no autorizada', tipo: 'ALERTA_OFICIAL' },
    });

    expect(response.statusCode).toBe(403);
  });
});

describe('createChatsParaIncidente', () => {
  it('crea chats PUBLICO_EVENTO y OPERATIVO_EVENTO al confirmar incidente', async () => {
    const { createChatsParaIncidente } = await import('../routes/chat.js');

    const incidente = { id: 'inc-1', municipio_id: 'mun-1', titulo: 'Incendio sector A' };

    // SELECT incidente, luego 2x SELECT existing (ambos vacíos), luego 2x INSERT
    (mockDb as any)
      .mockResolvedValueOnce([incidente]) // SELECT incidente
      .mockResolvedValueOnce([])          // SELECT existing PUBLICO_EVENTO
      .mockResolvedValueOnce([])          // INSERT PUBLICO_EVENTO
      .mockResolvedValueOnce([])          // SELECT existing OPERATIVO_EVENTO
      .mockResolvedValueOnce([]);         // INSERT OPERATIVO_EVENTO

    await createChatsParaIncidente('inc-1');

    // mockDb fue llamado 5 veces
    expect((mockDb as any).mock.calls.length).toBeGreaterThanOrEqual(5);
  });

  it('no crea chat si ya existe', async () => {
    const { createChatsParaIncidente } = await import('../routes/chat.js');

    const incidente = { id: 'inc-2', municipio_id: 'mun-1', titulo: 'Deslizamiento' };

    (mockDb as any)
      .mockResolvedValueOnce([incidente])                   // SELECT incidente
      .mockResolvedValueOnce([{ id: 'chat-existente-1' }]) // SELECT existing PUBLICO_EVENTO — ya existe
      .mockResolvedValueOnce([{ id: 'chat-existente-2' }]) // SELECT existing OPERATIVO_EVENTO — ya existe

    const callsBefore = (mockDb as any).mock.calls.length;
    await createChatsParaIncidente('inc-2');
    const callsAfter = (mockDb as any).mock.calls.length;

    // Solo 3 llamadas: 1 SELECT incidente + 2 SELECT existing — cero INSERTs
    expect(callsAfter - callsBefore).toBe(3);
  });
});
