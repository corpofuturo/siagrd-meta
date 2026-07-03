/**
 * chat.ts — Rutas de chat en tiempo real para SATAM
 *
 * Tipos de chat:
 *   PUBLICO_EVENTO   — ciudadanos + operadores (por incidente)
 *   OPERATIVO_EVENTO — solo operadores (por incidente)
 *   GENERAL          — canal general de operadores
 *
 * Dependencia WS: @fastify/websocket (registrado globalmente en index.ts)
 */

import type { FastifyInstance } from 'fastify';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import type { AuthenticatedUser, RolUsuario } from '../types/domain.js';

// ─── Tipos internos ───────────────────────────────────────────────────────────

type TipoChat = 'PUBLICO_EVENTO' | 'OPERATIVO_EVENTO' | 'GENERAL';
type TipoMensaje = 'TEXTO' | 'IMAGEN' | 'ALERTA_OFICIAL' | 'SISTEMA';

const _ROLES_OPERADORES: RolUsuario[] = ['SOCORRO', 'CMGRD', 'CDGRD', 'ADMIN'];
const ROLES_ALERTA_OFICIAL: RolUsuario[] = ['CMGRD', 'CDGRD', 'ADMIN'];

/** Tipos de chat visibles según rol */
function tiposPermitidos(rol: RolUsuario): TipoChat[] {
  if (rol === 'CIUDADANO') return ['PUBLICO_EVENTO'];
  return ['PUBLICO_EVENTO', 'OPERATIVO_EVENTO', 'GENERAL'];
}

function puedeVerChat(tipoChat: TipoChat, rol: RolUsuario): boolean {
  return tiposPermitidos(rol).includes(tipoChat);
}

// ─── Mapa de conexiones WebSocket activas ─────────────────────────────────────
// chat_id → Set<WebSocket>
// TODO: en producción multi-instancia reemplazar con Redis pub/sub
const wsConnections = new Map<string, Set<any>>();

function broadcast(chatId: string, payload: unknown): void {
  const conns = wsConnections.get(chatId);
  if (!conns) return;
  const data = JSON.stringify(payload);
  for (const ws of conns) {
    try {
      if (ws.readyState === 1 /* OPEN */) ws.send(data);
    } catch {
      conns.delete(ws);
    }
  }
}

// ─── Helpers de autenticación para WS (token en query param) ─────────────────

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET env var is required');
  return s;
}

async function authenticateWsToken(token: string): Promise<AuthenticatedUser> {
  let payload: { sub: string; email: string; anonymous?: boolean };
  try {
    payload = jwt.verify(token, getJwtSecret()) as any;
  } catch {
    throw new Error('Token inválido o expirado');
  }

  if (payload.anonymous) {
    return { id: payload.sub, email: payload.email, rol: 'CIUDADANO' } as AuthenticatedUser;
  }

  const [profile] = await db`
    SELECT id, email, rol, municipio_id, organismo_id
    FROM profiles
    WHERE id = ${payload.sub} AND activo = true
  `;
  if (!profile) throw new Error('Usuario no encontrado o inactivo');

  return {
    id: profile.id as string,
    email: profile.email as string,
    rol: profile.rol as RolUsuario,
    municipio_id: profile.municipio_id as string | undefined,
    organismo_id: profile.organismo_id as string | undefined,
  };
}

// ─── Función pública: auto-crear chats al confirmar incidente ─────────────────

export async function createChatsParaIncidente(incidenteId: string): Promise<void> {
  const [incidente] = await db`SELECT id, municipio_id, titulo FROM incidentes WHERE id = ${incidenteId}`;
  if (!incidente) return;

  const tipos: TipoChat[] = ['PUBLICO_EVENTO', 'OPERATIVO_EVENTO'];
  for (const tipo of tipos) {
    const [existing] = await db`
      SELECT id FROM chats WHERE incidente_id = ${incidenteId} AND tipo = ${tipo}
    `;
    if (!existing) {
      await db`
        INSERT INTO chats (incidente_id, tipo, nombre, municipio_id, activo, created_at)
        VALUES (
          ${incidenteId},
          ${tipo},
          ${tipo === 'PUBLICO_EVENTO'
            ? `Canal público: ${incidente.titulo}`
            : `Canal operativo: ${incidente.titulo}`},
          ${incidente.municipio_id},
          true,
          NOW()
        )
      `;
    }
  }
}

// ─── Registro de rutas ────────────────────────────────────────────────────────

export async function chatRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /chats ──────────────────────────────────────────────────────────────
  app.get('/chats', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const tipos = tiposPermitidos(user.rol);

    let rows: any[];
    if (user.rol === 'CIUDADANO') {
      // Solo chats PUBLICO_EVENTO de incidentes activos en su municipio
      if (!user.municipio_id) {
        return reply.send({ data: [], total: 0 });
      }
      rows = await db`
        SELECT c.id, c.tipo, c.nombre, c.incidente_id, c.municipio_id, c.created_at
        FROM chats c
        JOIN incidentes i ON i.id = c.incidente_id
        WHERE c.tipo = ANY(${tipos}::tipo_chat[])
          AND c.activo = true
          AND c.municipio_id = ${user.municipio_id}
          AND i.estado NOT IN ('CERRADO', 'CANCELADO', 'FALSO_POSITIVO')
        ORDER BY c.created_at DESC
      `;
    } else {
      rows = await db`
        SELECT c.id, c.tipo, c.nombre, c.incidente_id, c.municipio_id, c.created_at
        FROM chats c
        WHERE c.tipo = ANY(${tipos}::tipo_chat[])
          AND c.activo = true
        ORDER BY c.created_at DESC
        LIMIT 100
      `;
    }

    return reply.send({ data: rows, total: rows.length });
  });

  // ── GET /chats/:id/mensajes ─────────────────────────────────────────────────
  app.get('/chats/:id/mensajes', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { limit = '50', before } = request.query as { limit?: string; before?: string };
    const user = request.user!;

    const limitNum = Math.min(parseInt(limit, 10) || 50, 200);

    const [chat] = await db`SELECT id, tipo, municipio_id FROM chats WHERE id = ${id}`;
    if (!chat) throw new NotFoundError('Chat no encontrado');

    if (!puedeVerChat(chat.tipo as TipoChat, user.rol)) {
      throw new ForbiddenError('Sin acceso a este canal');
    }

    // CIUDADANO solo puede ver chats de su municipio
    if (user.rol === 'CIUDADANO' && chat.municipio_id !== user.municipio_id) {
      throw new ForbiddenError('Sin acceso a este canal');
    }

    let mensajes: any[];
    if (before) {
      const beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) throw new ValidationError('Parámetro before inválido');
      mensajes = await db`
        SELECT m.id, m.chat_id, m.autor_id, m.tipo, m.contenido, m.metadata, m.created_at,
               p.nombre, p.apellido, p.rol AS autor_rol
        FROM mensajes_chat m
        LEFT JOIN profiles p ON p.id = m.autor_id
        WHERE m.chat_id = ${id} AND m.created_at < ${beforeDate}
        ORDER BY m.created_at DESC
        LIMIT ${limitNum}
      `;
    } else {
      mensajes = await db`
        SELECT m.id, m.chat_id, m.autor_id, m.tipo, m.contenido, m.metadata, m.created_at,
               p.nombre, p.apellido, p.rol AS autor_rol
        FROM mensajes_chat m
        LEFT JOIN profiles p ON p.id = m.autor_id
        WHERE m.chat_id = ${id}
        ORDER BY m.created_at DESC
        LIMIT ${limitNum}
      `;
    }

    return reply.send({ data: mensajes.reverse(), total: mensajes.length });
  });

  // ── POST /chats/:id/mensajes ────────────────────────────────────────────────
  app.post('/chats/:id/mensajes', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user!;
    const body = request.body as { contenido: string; tipo?: TipoMensaje; metadata?: unknown };

    if (!body?.contenido?.trim()) throw new ValidationError('contenido es requerido');

    const [chat] = await db`SELECT id, tipo, municipio_id FROM chats WHERE id = ${id} AND activo = true`;
    if (!chat) throw new NotFoundError('Chat no encontrado o inactivo');

    if (!puedeVerChat(chat.tipo as TipoChat, user.rol)) {
      throw new ForbiddenError('Sin acceso a este canal');
    }

    if (user.rol === 'CIUDADANO' && chat.municipio_id !== user.municipio_id) {
      throw new ForbiddenError('Sin acceso a este canal');
    }

    const tipoMensaje: TipoMensaje = body.tipo ?? 'TEXTO';

    // Solo CMGRD/CDGRD/ADMIN pueden enviar ALERTA_OFICIAL
    if (tipoMensaje === 'ALERTA_OFICIAL' && !ROLES_ALERTA_OFICIAL.includes(user.rol)) {
      throw new ForbiddenError('Solo autoridades pueden emitir alertas oficiales');
    }

    const [mensaje] = await db`
      INSERT INTO mensajes_chat (chat_id, autor_id, tipo, contenido, metadata, created_at)
      VALUES (${id}, ${user.id}, ${tipoMensaje as string}, ${body.contenido.trim()}, ${(body.metadata ?? null) as any}, NOW())
      RETURNING id, chat_id, autor_id, tipo, contenido, metadata, created_at
    `;

    const payload = {
      ...mensaje,
      autor_nombre: user.email,
      autor_rol: user.rol,
    };

    // Broadcast a todos los WebSocket conectados en este chat
    broadcast(id, { event: 'nuevo_mensaje', data: payload });

    return reply.status(201).send({ data: payload });
  });

  // ── WS /chats/:id/ws ────────────────────────────────────────────────────────
  app.get('/chats/:id/ws', { websocket: true }, async (connection, request) => {
    const { id } = request.params as { id: string };
    const { token: queryToken } = request.query as { token?: string };
    // App movil: token en query param. Panel-web: cookie httpOnly siagrd_token
    // (el navegador la envia sola en el handshake WS, sin necesidad de exponerla via JS — DT-006).
    const token = queryToken ?? request.cookies?.siagrd_token;

    if (!token) {
      connection.socket.close(4001, 'Token requerido');
      return;
    }

    let user: AuthenticatedUser;
    try {
      user = await authenticateWsToken(token);
    } catch (err: any) {
      connection.socket.close(4003, err.message ?? 'No autorizado');
      return;
    }

    const [chat] = await db`SELECT id, tipo, municipio_id FROM chats WHERE id = ${id} AND activo = true`;
    if (!chat || !puedeVerChat(chat.tipo as TipoChat, user.rol)) {
      connection.socket.close(4004, 'Chat no disponible o sin acceso');
      return;
    }

    if (user.rol === 'CIUDADANO' && chat.municipio_id !== user.municipio_id) {
      connection.socket.close(4004, 'Sin acceso a este municipio');
      return;
    }

    // Registrar conexión
    if (!wsConnections.has(id)) wsConnections.set(id, new Set());
    wsConnections.get(id)!.add(connection.socket);

    connection.socket.send(JSON.stringify({ event: 'connected', chat_id: id }));

    connection.socket.on('close', () => {
      wsConnections.get(id)?.delete(connection.socket);
    });

    // Mensajes entrantes por WS (opcional — el envío canónico es vía POST)
    connection.socket.on('message', (_raw: Buffer) => {
      // ignorar pings / keep-alive; el envío real usa POST /chats/:id/mensajes
    });
  });
}
