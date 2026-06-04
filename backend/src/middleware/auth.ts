import type { FastifyRequest, FastifyReply } from 'fastify';
import { supabaseAnon } from '../lib/supabase.js';
import { UnauthorizedError } from '../utils/errors.js';
import type { AuthenticatedUser } from '../types/domain.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token requerido');
  }

  const token = header.slice(7);
  const {
    data: { user },
    error,
  } = await supabaseAnon.auth.getUser(token);

  if (error || !user) {
    throw new UnauthorizedError('Token inválido o expirado');
  }

  const { data: profile } = await supabaseAnon
    .from('profiles')
    .select('rol, municipio_id, organismo_id')
    .eq('id', user.id)
    .single();

  request.user = {
    id: user.id,
    email: user.email!,
    rol: profile?.rol ?? 'CIUDADANO',
    municipio_id: profile?.municipio_id ?? undefined,
    organismo_id: profile?.organismo_id ?? undefined,
  };
}
