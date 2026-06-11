import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, UnauthorizedError, ValidationError } from '../utils/errors.js';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) throw new Error('[FATAL] JWT_SECRET env var is required');
const JWT_EXPIRES_IN = '8h';
const JWT_REFRESH_EXPIRES_IN = '30d';

function makeTokens(userId: string, email: string) {
  const access_token = jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refresh_token = jwt.sign({ sub: userId, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  return { access_token, refresh_token };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /auth/login
  app.post<{ Body: { email: string; password: string } }>(
    '/auth/login',
    async (request, reply) => {
      const { email, password } = request.body;
      if (!email) throw new ValidationError('El campo email es requerido');
      if (!password) throw new ValidationError('El campo password es requerido');

      const [user] = await db`
        SELECT id, email, password_hash, rol, municipio_id, nombre, apellido, activo
        FROM profiles
        WHERE email = ${email}
      `;

      if (!user || !user.activo) throw new UnauthorizedError('Credenciales inválidas');

      const valid = await bcrypt.compare(password, user.password_hash as string);
      if (!valid) throw new UnauthorizedError('Credenciales inválidas');

      const { access_token, refresh_token } = makeTokens(String(user.id), user.email as string);

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

  // POST /auth/register
  app.post<{ Body: { email: string; password: string; nombre: string; apellido: string } }>(
    '/auth/register',
    async (request, reply) => {
      const { email, password, nombre, apellido } = request.body;
      if (!email) throw new ValidationError('El campo email es requerido');
      if (!password) throw new ValidationError('El campo password es requerido');
      if (!nombre) throw new ValidationError('El campo nombre es requerido');
      if (password.length < 6) throw new ValidationError('La contraseña debe tener al menos 6 caracteres');

      const [existing] = await db`SELECT id FROM profiles WHERE email = ${email}`;
      if (existing) throw new ValidationError('Este correo ya está registrado');

      const password_hash = await bcrypt.hash(password, 10);
      const [user] = await db`
        INSERT INTO profiles (email, password_hash, nombre, apellido, rol, activo)
        VALUES (${email}, ${password_hash}, ${nombre}, ${apellido ?? ''}, 'ciudadano', true)
        RETURNING id, email, nombre, apellido, rol, municipio_id
      `;

      const { access_token, refresh_token } = makeTokens(String(user.id), user.email as string);

      return reply.status(201).send({
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

  // POST /auth/anonymous — sesión de ciudadano anónimo (sin DB, token local)
  app.post('/auth/anonymous', async (_request, reply) => {
    const anonymousId = `anon_${Date.now()}`;
    const access_token = jwt.sign(
      { sub: anonymousId, email: 'anonimo@satam.co', anonymous: true },
      JWT_SECRET,
      { expiresIn: '24h' },
    );
    return reply.send({
      access_token,
      refresh_token: '',
      expires_in: 86400,
      user: {
        id: anonymousId,
        email: 'anonimo@satam.co',
        nombre: 'Ciudadano',
        apellido: 'Anónimo',
        rol: 'ciudadano',
        municipio_id: null,
      },
    });
  });

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
        { expiresIn: JWT_EXPIRES_IN },
      );

      return reply.send({ access_token, refresh_token });
    },
  );

  // POST /auth/seed — crea usuarios demo (solo ambiente de desarrollo, solo ADMIN)
  app.post('/auth/seed', { preHandler: authMiddleware }, async (request, reply) => {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenError('Endpoint deshabilitado en producción');
    }
    if ((request.user as any)?.rol !== 'ADMIN') {
      throw new ForbiddenError('Solo ADMIN puede ejecutar seed');
    }
    const hash_admin   = '$2a$10$e5cmIFiV3tNqzjoDfqxGruOcbABV7rtMfzlX8N4LO9Cv7ujIyq5Pq';
    const hash_bombero = '$2a$10$../BhUnSXYzDvjA/Vwdt8ORWEqedWvRJ0jKjZTvUYIef1/euB5ZVy';

    await db`
      INSERT INTO profiles (email, password_hash, nombre, apellido, rol, activo)
      VALUES
        ('admin',   ${hash_admin},   'Administrador', 'SATAM', 'admin',    true),
        ('bombero', ${hash_bombero}, 'Bombero',       'Demo',  'operador', true)
      ON CONFLICT (email) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            rol           = EXCLUDED.rol,
            activo        = EXCLUDED.activo
    `;

    return reply.send({ ok: true, users: ['admin', 'bombero'] });
  });

  // POST /auth/logout
  app.post('/auth/logout', { preHandler: authMiddleware }, async (_request, reply) => {
    return reply.send({ message: 'Sesión cerrada' });
  });

  // GET /auth/me
  app.get('/auth/me', { preHandler: authMiddleware }, async (request, reply) => {
    // Anónimos: devolver perfil desde el token mismo
    if ((request.user as any)?.anonymous) {
      return reply.send({
        data: {
          id: request.user!.id,
          email: 'anonimo@satam.co',
          nombre: 'Ciudadano',
          apellido: 'Anónimo',
          rol: 'ciudadano',
          municipio_id: null,
          activo: true,
        },
      });
    }

    const [profile] = await db`
      SELECT id, email, nombre, apellido, rol, municipio_id, organismo_id, foto_url, activo
      FROM profiles
      WHERE id = ${request.user!.id}
    `;
    if (!profile) throw new UnauthorizedError('Perfil no encontrado');
    return reply.send({ data: profile });
  });
}
