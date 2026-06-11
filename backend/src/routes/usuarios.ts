import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';

const VALID_ROLES = ['ADMIN', 'CDGRD', 'CMGRD', 'SOCORRO', 'CIUDADANO'] as const;

const bulkImportSchema = z.object({
  usuarios: z
    .array(
      z.object({
        email: z.string().email(),
        nombre: z.string().min(1),
        rol: z.enum(VALID_ROLES),
        municipio_id: z.string().uuid().optional(),
      })
    )
    .min(1)
    .max(100),
});

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

  // POST /bulk-import — importación masiva de usuarios (solo ADMIN)
  app.post<{ Body: z.infer<typeof bulkImportSchema> }>('/usuarios/bulk-import', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (user.rol !== 'ADMIN') throw new ForbiddenError('Solo ADMIN puede importar usuarios');

    const parsed = bulkImportSchema.safeParse(request.body);
    if (!parsed.success) throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));

    const { usuarios } = parsed.data;
    let insertados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    const credenciales: Array<{ email: string; password_temporal: string }> = [];

    await db.begin(async (sql) => {
      for (const u of usuarios) {
        try {
          // Generar contraseña temporal segura de 12 caracteres
          const password_temporal = crypto.randomBytes(9).toString('base64url').slice(0, 12);
          const password_hash = await bcrypt.hash(password_temporal, 10);

          const [result] = await sql`
            INSERT INTO profiles (email, nombre, rol, municipio_id, password_hash, activo)
            VALUES (${u.email}, ${u.nombre}, ${u.rol}, ${u.municipio_id ?? null}, ${password_hash}, true)
            ON CONFLICT (email) DO NOTHING
            RETURNING id
          `;
          if (result) {
            insertados++;
            credenciales.push({ email: u.email, password_temporal });
          } else {
            omitidos++;
          }
        } catch (err: unknown) {
          errores.push(`${u.email}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });

    // Retornar credenciales temporales UNA SOLA VEZ — no se vuelven a mostrar
    return reply.send({ insertados, omitidos, errores, credenciales });
  });
}
