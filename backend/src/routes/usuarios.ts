import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';

export async function usuariosRoutes(app: FastifyInstance): Promise<void> {
  // GET /usuarios — lista usuarios (solo ADMIN y CDGRD)
  app.get('/usuarios', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!['ADMIN', 'CDGRD'].includes(user.rol)) throw new ForbiddenError('Sin acceso');

    const rows = await db`
      SELECT id, email, nombre, apellido, rol, municipio_id, organismo_id, activo, created_at
      FROM profiles
      ORDER BY created_at DESC
    `;
    return reply.send({ data: rows, total: rows.length });
  });

  // GET /usuarios/:id
  app.get<{ Params: { id: string } }>('/usuarios/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!['ADMIN', 'CDGRD'].includes(user.rol)) throw new ForbiddenError('Sin acceso');

    const [row] = await db`SELECT id, email, nombre, apellido, rol, municipio_id, organismo_id, activo FROM profiles WHERE id = ${request.params.id}`;
    if (!row) throw new NotFoundError('Usuario');
    return reply.send({ data: row });
  });

  // PATCH /usuarios/:id/rol — cambiar rol (solo ADMIN)
  app.patch<{ Params: { id: string }; Body: { rol: string } }>('/usuarios/:id/rol', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (user.rol !== 'ADMIN') throw new ForbiddenError('Solo ADMIN puede cambiar roles');

    const roles = ['ADMIN', 'CDGRD', 'CMGRD', 'SOCORRO', 'CIUDADANO'];
    if (!roles.includes(request.body.rol)) throw new ValidationError('Rol inválido');

    const [row] = await db`
      UPDATE profiles SET rol = ${request.body.rol}, updated_at = NOW()
      WHERE id = ${request.params.id}
      RETURNING id, email, nombre, apellido, rol
    `;
    if (!row) throw new NotFoundError('Usuario');
    return reply.send({ data: row });
  });

  // PATCH /usuarios/:id/activo — activar/desactivar (solo ADMIN)
  app.patch<{ Params: { id: string }; Body: { activo: boolean } }>('/usuarios/:id/activo', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (user.rol !== 'ADMIN') throw new ForbiddenError('Solo ADMIN puede activar/desactivar usuarios');

    const [row] = await db`
      UPDATE profiles SET activo = ${request.body.activo}, updated_at = NOW()
      WHERE id = ${request.params.id}
      RETURNING id, email, nombre, apellido, activo
    `;
    if (!row) throw new NotFoundError('Usuario');
    return reply.send({ data: row });
  });
}
