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

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET env var is required');
  return s;
}

export function requireRole(roles: string[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.user) throw new UnauthorizedError('No autenticado');
    const userRole = ((request.user as any).rol ?? '').toUpperCase();
    const allowed = roles.map((r) => r.toUpperCase());
    if (!allowed.includes(userRole)) {
      throw new UnauthorizedError('Permisos insuficientes');
    }
  };
}

export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  // La app movil (Bearer) y el panel-web (cookie httpOnly siagrd_token) son
  // ambos clientes validos — DT-006. La cookie nunca se lee via JS.
  const token = header?.startsWith('Bearer ') ? header.slice(7) : request.cookies?.siagrd_token;

  if (!token) {
    throw new UnauthorizedError('Token requerido');
  }

  let payload: { sub: string; email: string; anonymous?: boolean };

  try {
    payload = jwt.verify(token, getJwtSecret()) as unknown as { sub: string; email: string; anonymous?: boolean };
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
