import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { AuthenticatedUser } from '../types/domain.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required');

export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token requerido');
  }

  const token = header.slice(7);
  let payload: { sub: string; email: string; anonymous?: boolean };

  try {
    payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string; anonymous?: boolean };
  } catch {
    throw new UnauthorizedError('Token inválido o expirado');
  }

  // Token anónimo: no requiere fila en DB
  if (payload.anonymous) {
    request.user = {
      id: payload.sub,
      email: payload.email,
      rol: 'ciudadano',
      municipio_id: undefined,
      organismo_id: undefined,
    } as any;
    return;
  }

  const [profile] = await db`
    SELECT id, email, rol, municipio_id, organismo_id
    FROM profiles
    WHERE id = ${payload.sub}
    AND activo = true
  `;

  if (!profile) {
    throw new UnauthorizedError('Usuario no encontrado o inactivo');
  }

  request.user = {
    id: profile.id as string,
    email: profile.email as string,
    rol: profile.rol as AuthenticatedUser['rol'],
    municipio_id: profile.municipio_id as string | undefined,
    organismo_id: profile.organismo_id as string | undefined,
  };
}
