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
  // GET /usuarios — lista usuarios (solo ADMIN y CDGRD), con filtros y busqueda
  app.get('/usuarios', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!['ADMIN', 'CDGRD'].includes(user.rol)) throw new ForbiddenError('Sin acceso');

    const { rol, municipio_id, q, limit, offset } = request.query as {
      rol?: string; municipio_id?: string; q?: string; limit?: string; offset?: string;
    };
    const limitNum = Math.min(limit ? parseInt(limit, 10) || 20 : 20, 100);
    const offsetNum = offset ? Math.max(parseInt(offset, 10), 0) : 0;
    const rolFiltro = rol && VALID_ROLES.includes(rol as typeof VALID_ROLES[number]) ? rol : undefined;
    const busqueda = q?.trim() ? `%${q.trim()}%` : undefined;

    // Se construye la clausula WHERE con parametros posicionales via db.unsafe
    // en vez de fragmentos anidados (${cond ? db`x` : db`TRUE`}) — mas simple
    // de testear con mocks y evita anidar tagged templates innecesariamente.
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (rolFiltro) { params.push(rolFiltro); conditions.push(`p.rol = $${params.length}`); }
    if (municipio_id) { params.push(municipio_id); conditions.push(`p.municipio_id = $${params.length}`); }
    if (busqueda) {
      params.push(busqueda);
      const idx = params.length;
      conditions.push(`(p.nombre ILIKE $${idx} OR p.apellido ILIKE $${idx} OR p.email ILIKE $${idx})`);
    }
    const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [{ count }] = await db.unsafe(
      `SELECT COUNT(*)::int AS count FROM profiles p ${whereSql}`,
      params as any[],
    );

    const rows = await db.unsafe(
      `
      SELECT p.id, p.email, p.nombre, p.apellido, p.rol, p.municipio_id, p.organismo_id, p.activo, p.created_at,
             m.nombre AS municipio_nombre, o.nombre AS organismo_nombre
      FROM profiles p
      LEFT JOIN municipios m ON m.id = p.municipio_id
      LEFT JOIN organismos o ON o.id = p.organismo_id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limitNum, offsetNum] as any[],
    );
    return reply.send({ data: rows, total: count, limit: limitNum, offset: offsetNum });
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

  // PATCH /usuarios/:id — editar datos basicos (ADMIN o CDGRD)
  app.patch<{ Params: { id: string } }>('/usuarios/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!['ADMIN', 'CDGRD'].includes(user.rol)) throw new ForbiddenError('Sin acceso');

    const { id } = request.params;
    const [existing] = await db`SELECT id FROM profiles WHERE id = ${id}`;
    if (!existing) throw new NotFoundError('Usuario');

    const body = request.body as Record<string, unknown>;
    const allowed = ['nombre', 'apellido', 'documento', 'celular', 'municipio_id', 'organismo_id'];
    const updates: Record<string, unknown> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    // Solo ADMIN puede reasignar rol via este endpoint (CDGRD usa /usuarios/:id/rol si aplica)
    if (body.rol !== undefined) {
      if (user.rol !== 'ADMIN') throw new ForbiddenError('Solo ADMIN puede cambiar el rol');
      if (!VALID_ROLES.includes(body.rol as typeof VALID_ROLES[number])) throw new ValidationError('Rol inválido');
      updates.rol = body.rol;
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('Sin campos para actualizar');

    updates.updated_at = new Date();
    const sets = Object.entries(updates).map(([k, v]) => db`${db(k)} = ${v as any}`);
    const [updated] = await db`
      UPDATE profiles
      SET ${sets.reduce((a, b) => db`${a}, ${b}`)}
      WHERE id = ${id}
      RETURNING id, email, nombre, apellido, rol, municipio_id, organismo_id, activo
    `;
    return reply.send({ data: updated });
  });

  // POST /usuarios — crear un único usuario (ADMIN o CDGRD)
  app.post('/usuarios', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!['ADMIN', 'CDGRD'].includes(user.rol)) throw new ForbiddenError('Sin acceso');

    const { email, nombre, apellido, password, rol, documento, celular, municipio_id } = request.body as Record<string, string | undefined>;
    if (!email?.trim() || !nombre?.trim() || !apellido?.trim() || !password?.trim()) {
      throw new ValidationError('email, nombre, apellido y password son requeridos');
    }

    const rolFinal = VALID_ROLES.includes(rol as typeof VALID_ROLES[number]) ? (rol as typeof VALID_ROLES[number]) : 'CIUDADANO';

    const [existing] = await db`SELECT id FROM profiles WHERE email = ${email.toLowerCase().trim()}`;
    if (existing) throw new ValidationError('El correo ya está registrado');

    const password_hash = await bcrypt.hash(password, 10);
    const [created] = await db`
      INSERT INTO profiles (email, password_hash, nombre, apellido, rol, documento, celular, municipio_id, activo)
      VALUES (
        ${email.toLowerCase().trim()}, ${password_hash},
        ${nombre.trim()}, ${apellido.trim()}, ${rolFinal},
        ${documento?.trim() || null}, ${celular?.trim() || null}, ${municipio_id || null},
        true
      )
      RETURNING id, email, nombre, apellido, rol
    `;
    return reply.status(201).send({ data: created });
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
