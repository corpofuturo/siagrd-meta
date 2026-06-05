import type { FastifyInstance } from 'fastify';
import { supabaseAnon, supabaseAdmin } from '../lib/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';

interface LoginBody {
  email: string;
  tipo_login: 'password' | 'otp';
  password?: string;
  phone?: string;
}

interface RefreshBody {
  refresh_token: string;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /auth/login — pública
  app.post<{ Body: LoginBody }>(
    '/auth/login',
    async (request, reply) => {
      const { email, tipo_login, password } = request.body;

      if (!email) throw new ValidationError('El campo email es requerido');

      if (tipo_login === 'password') {
        if (!password) throw new ValidationError('El campo password es requerido');

        const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

        if (error || !data.session || !data.user) {
          if (error?.message?.includes('Invalid login')) {
            throw new UnauthorizedError('Credenciales inválidas');
          }
          throw new UnauthorizedError(error?.message ?? 'Error de autenticación');
        }

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id, email, rol, municipio_id')
          .eq('id', data.user.id)
          .single();

        return reply.send({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user: {
            id: data.user.id,
            email: data.user.email,
            rol: profile?.rol ?? 'CIUDADANO',
            municipio_id: profile?.municipio_id ?? null,
          },
        });
      }

      throw new ValidationError('tipo_login no soportado');
    },
  );

  // POST /auth/refresh — pública
  app.post<{ Body: RefreshBody }>(
    '/auth/refresh',
    async (request, reply) => {
      const { refresh_token } = request.body;
      if (!refresh_token) throw new ValidationError('El campo refresh_token es requerido');

      const { data, error } = await supabaseAnon.auth.refreshSession({ refresh_token });

      if (error || !data.session) {
        throw new UnauthorizedError('refresh_token inválido o expirado');
      }

      return reply.send({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    },
  );

  // POST /auth/logout — requiere token
  app.post(
    '/auth/logout',
    { preHandler: authMiddleware },
    async (_request, reply) => {
      await supabaseAnon.auth.signOut();
      return reply.send({ message: 'Sesión cerrada' });
    },
  );

  // GET /auth/me — requiere token
  app.get(
    '/auth/me',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('id, nombre, apellido, rol, municipio_id, organismo_id, foto_url, activo')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        throw new UnauthorizedError('Perfil de usuario no encontrado');
      }

      return reply.send({ data: profile });
    },
  );
}
