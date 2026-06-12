import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_ADMIN: RolUsuario[] = ['ADMIN', 'CDGRD'];
const _ROLES_DIRECTOR: RolUsuario[] = ['ADMIN', 'CDGRD', 'SOCORRO'];

export async function organismosRoutes(app: FastifyInstance): Promise<void> {

  // ── GET /organismos ─────────────────────────────────────────────────────────
  app.get('/organismos', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { municipio_id, activo } = request.query as { municipio_id?: string; activo?: string };

    let rows: any[];
    if (ROLES_ADMIN.includes(user.rol)) {
      rows = await db`
        SELECT o.*, m.nombre AS municipio_nombre,
               p.nombre AS director_nombre, p.apellido AS director_apellido, p.email AS director_email
        FROM organismos o
        LEFT JOIN municipios m ON m.id = o.municipio_id
        LEFT JOIN profiles p ON p.id = o.director_id
        WHERE (${ municipio_id ? db`o.municipio_id = ${municipio_id}` : db`TRUE` })
          AND (${ activo !== undefined ? db`o.activo = ${activo === 'true'}` : db`TRUE` })
        ORDER BY o.nombre
      `;
    } else {
      // Operadores ven solo los organismos de su municipio
      const mid = user.municipio_id;
      if (!mid) return reply.send({ data: [], total: 0 });
      rows = await db`
        SELECT o.*, m.nombre AS municipio_nombre,
               p.nombre AS director_nombre, p.apellido AS director_apellido, p.email AS director_email
        FROM organismos o
        LEFT JOIN municipios m ON m.id = o.municipio_id
        LEFT JOIN profiles p ON p.id = o.director_id
        WHERE o.municipio_id = ${mid} AND o.activo = true
        ORDER BY o.nombre
      `;
    }

    return reply.send({ data: rows, total: rows.length });
  });

  // ── GET /organismos/:id ─────────────────────────────────────────────────────
  app.get('/organismos/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [row] = await db`
      SELECT o.*, m.nombre AS municipio_nombre,
             p.nombre AS director_nombre, p.apellido AS director_apellido, p.email AS director_email
      FROM organismos o
      LEFT JOIN municipios m ON m.id = o.municipio_id
      LEFT JOIN profiles p ON p.id = o.director_id
      WHERE o.id = ${id}
    `;
    if (!row) throw new NotFoundError('Organismo no encontrado');

    return reply.send(row);
  });

  // ── POST /organismos ────────────────────────────────────────────────────────
  app.post('/organismos', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden crear organismos');

    const body = request.body as {
      nombre: string;
      tipo?: string;
      funciones?: string;
      ubicacion?: string;
      municipio_id?: string;
      email?: string;
      telefono?: string;
    };

    if (!body?.nombre?.trim()) throw new ValidationError('nombre es requerido');

    const [row] = await db`
      INSERT INTO organismos (nombre, tipo, funciones, ubicacion, municipio_id, email, telefono, activo, created_at, updated_at)
      VALUES (
        ${body.nombre.trim()},
        ${(body.tipo ?? 'OTRO') as any},
        ${body.funciones ?? null},
        ${body.ubicacion ?? null},
        ${body.municipio_id ?? null},
        ${body.email ?? null},
        ${body.telefono ?? null},
        true, NOW(), NOW()
      )
      RETURNING *
    `;

    return reply.status(201).send(row);
  });

  // ── PATCH /organismos/:id ───────────────────────────────────────────────────
  app.patch('/organismos/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [org] = await db`SELECT id, director_id FROM organismos WHERE id = ${id}`;
    if (!org) throw new NotFoundError('Organismo no encontrado');

    // ADMIN/CDGRD pueden editar cualquiera; director puede editar el suyo
    const esDirector = org.director_id === user.id;
    if (!ROLES_ADMIN.includes(user.rol) && !esDirector) {
      throw new ForbiddenError('Sin permiso para editar este organismo');
    }

    const body = request.body as Record<string, any>;
    const allowed = ['nombre', 'tipo', 'funciones', 'ubicacion', 'municipio_id', 'email', 'telefono', 'activo', 'director_id'];
    const updates: Record<string, any> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('Sin campos para actualizar');

    // director_id solo lo puede cambiar ADMIN/CDGRD
    if (updates.director_id && !ROLES_ADMIN.includes(user.rol)) {
      throw new ForbiddenError('Solo ADMIN/CDGRD pueden cambiar el director');
    }

    updates.updated_at = new Date();

    const sets = Object.entries(updates).map(([k, v]) => db`${db(k)} = ${v}`);
    const [updated] = await db`
      UPDATE organismos SET ${sets.reduce((a, b) => db`${a}, ${b}`)} WHERE id = ${id} RETURNING *
    `;

    return reply.send(updated);
  });

  // ── DELETE /organismos/:id ──────────────────────────────────────────────────
  app.delete('/organismos/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden eliminar organismos');

    const { id } = request.params as { id: string };
    const [org] = await db`SELECT id FROM organismos WHERE id = ${id}`;
    if (!org) throw new NotFoundError('Organismo no encontrado');

    // Soft delete
    await db`UPDATE organismos SET activo = false, updated_at = NOW() WHERE id = ${id}`;
    return reply.status(204).send();
  });

  // ── GET /organismos/:id/usuarios ────────────────────────────────────────────
  app.get('/organismos/:id/usuarios', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [org] = await db`SELECT id, director_id FROM organismos WHERE id = ${id}`;
    if (!org) throw new NotFoundError('Organismo no encontrado');

    const esDirector = org.director_id === user.id;
    if (!ROLES_ADMIN.includes(user.rol) && !esDirector) {
      throw new ForbiddenError('Sin acceso a usuarios de este organismo');
    }

    const rows = await db`
      SELECT id, email, nombre, apellido, documento, celular, rol, activo, created_at
      FROM profiles
      WHERE organismo_id = ${id}
      ORDER BY apellido, nombre
    `;

    return reply.send({ data: rows, total: rows.length });
  });

  // ── POST /organismos/:id/usuarios ───────────────────────────────────────────
  app.post('/organismos/:id/usuarios', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const [org] = await db`SELECT id, director_id, municipio_id FROM organismos WHERE id = ${id} AND activo = true`;
    if (!org) throw new NotFoundError('Organismo no encontrado o inactivo');

    const esDirector = org.director_id === user.id;
    if (!ROLES_ADMIN.includes(user.rol) && !esDirector) {
      throw new ForbiddenError('Solo el director del organismo o un administrador puede crear usuarios');
    }

    const body = request.body as {
      email: string;
      nombre: string;
      apellido: string;
      documento?: string;
      celular?: string;
      password: string;
      rol?: RolUsuario;
    };

    if (!body?.email?.trim()) throw new ValidationError('email es requerido');
    if (!body?.nombre?.trim()) throw new ValidationError('nombre es requerido');
    if (!body?.apellido?.trim()) throw new ValidationError('apellido es requerido');
    if (!body?.password || body.password.length < 6) throw new ValidationError('password mínimo 6 caracteres');

    const emailLower = body.email.trim().toLowerCase();
    const [existing] = await db`SELECT id FROM profiles WHERE email = ${emailLower}`;
    if (existing) throw new ValidationError('El correo ya está registrado');

    // Director solo puede crear roles SOCORRO; ADMIN puede crear cualquier rol
    const rolNuevo: RolUsuario = body.rol ?? 'SOCORRO';
    if (!ROLES_ADMIN.includes(user.rol) && rolNuevo !== 'SOCORRO') {
      throw new ForbiddenError('El director solo puede crear usuarios con rol SOCORRO');
    }

    const hash = await bcrypt.hash(body.password, 10);
    const [nuevo] = await db`
      INSERT INTO profiles (email, password_hash, nombre, apellido, documento, celular, rol, municipio_id, organismo_id, activo, created_at)
      VALUES (
        ${emailLower},
        ${hash},
        ${body.nombre.trim()},
        ${body.apellido.trim()},
        ${body.documento ?? null},
        ${body.celular ?? null},
        ${rolNuevo as string},
        ${org.municipio_id ?? null},
        ${id},
        true,
        NOW()
      )
      RETURNING id, email, nombre, apellido, documento, celular, rol, municipio_id, organismo_id, activo, created_at
    `;

    return reply.status(201).send(nuevo);
  });

  // ── PATCH /organismos/:org_id/usuarios/:user_id ─────────────────────────────
  app.patch('/organismos/:org_id/usuarios/:user_id', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    const { org_id, user_id } = request.params as { org_id: string; user_id: string };

    const [org] = await db`SELECT id, director_id FROM organismos WHERE id = ${org_id}`;
    if (!org) throw new NotFoundError('Organismo no encontrado');

    const esDirector = org.director_id === user.id;
    if (!ROLES_ADMIN.includes(user.rol) && !esDirector) {
      throw new ForbiddenError('Sin permiso');
    }

    const [perfil] = await db`SELECT id, organismo_id FROM profiles WHERE id = ${user_id}`;
    if (!perfil || perfil.organismo_id !== org_id) throw new NotFoundError('Usuario no pertenece a este organismo');

    const body = request.body as Record<string, any>;
    const allowed = ['nombre', 'apellido', 'documento', 'celular', 'activo'];
    const updates: Record<string, any> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('Sin campos para actualizar');

    const sets = Object.entries(updates).map(([k, v]) => db`${db(k)} = ${v}`);
    const [updated] = await db`
      UPDATE profiles SET ${sets.reduce((a, b) => db`${a}, ${b}`)} WHERE id = ${user_id} RETURNING id, email, nombre, apellido, documento, celular, rol, activo
    `;

    return reply.send(updated);
  });
}
