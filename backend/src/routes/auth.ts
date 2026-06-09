import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { UnauthorizedError, ValidationError } from '../utils/errors.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = '8h';
const JWT_REFRESH_EXPIRES_IN = '30d';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /auth/login
  app.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    async (request, reply) => {
      const { email, password } = request.body;
      if (!email) throw new ValidationError('El campo email es requerido');
      if (!password) throw new ValidationError('El campo password es requerido');

      const [user] = await db`
        SELECT p.id, p.email, p.password_hash, p.rol, p.municipio_id, p.nombre, p.apellido, p.activo
        FROM profiles p
        WHERE p.email = ${email}
      `;

      if (!user || !user.activo) throw new UnauthorizedError('Credenciales inválidas');

      const valid = await bcrypt.compare(password, user.password_hash as string);
      if (!valid) throw new UnauthorizedError('Credenciales inválidas');

      const access_token = jwt.sign(
        { sub: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );
      const refresh_token = jwt.sign(
        { sub: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
      );

      return reply.send({
        access_token,
        refresh_token,
        expires_in: 28800,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          rol: user.rol,
          municipio_id: user.municipio_id ?? null,
        },
      });
    },
  );

  // POST /auth/refresh
  app.post<{ Body: { refresh_token: string } }>(
    '/auth/refresh',
    async (request, reply) => {
      const { refresh_token } = request.body;
      if (!refresh_token) throw new ValidationError('El campo refresh_token es requerido');

      let payload: { sub: string; type?: string };
      try {
        payload = jwt.verify(refresh_token, JWT_SECRET) as { sub: string; type?: string };
      } catch {
        throw new UnauthorizedError('refresh_token inválido o expirado');
      }

      if (payload.type !== 'refresh') throw new UnauthorizedError('Token no es de tipo refresh');

      const [user] = await db`SELECT id, email FROM profiles WHERE id = ${payload.sub} AND activo = true`;
      if (!user) throw new UnauthorizedError('Usuario no encontrado');

      const access_token = jwt.sign(
        { sub: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return reply.send({ access_token, refresh_token });
    },
  );

  // POST /auth/logout
  app.post('/auth/logout', { preHandler: authMiddleware }, async (_request, reply) => {
    return reply.send({ message: 'Sesión cerrada' });
  });

  // GET /auth/me
  app.get('/auth/me', { preHandler: authMiddleware }, async (request, reply) => {
    const [profile] = await db`
      SELECT id, email, nombre, apellido, rol, municipio_id, organismo_id, foto_url, activo
      FROM profiles
      WHERE id = ${request.user!.id}
    `;
    if (!profile) throw new UnauthorizedError('Perfil no encontrado');
    return reply.send({ data: profile });
  });
}
