import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_ADMIN: RolUsuario[] = ['ADMIN', 'CDGRD'];

export async function gruposRoutes(app: FastifyInstance): Promise<void> {

  // ── GET /grupos/resumen ──────────────────────────────────────────────────────
  app.get('/grupos/resumen', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden ver el resumen de grupos');

    const [counts] = await db`
      SELECT
        COUNT(*) FILTER (WHERE rol = 'SOCORRO')    AS socorro,
        COUNT(*) FILTER (WHERE rol = 'CIUDADANO')  AS ciudadanos_registrados
      FROM profiles
      WHERE activo = true
    `;

    const [jalCount] = await db`SELECT COUNT(*) AS total FROM juntas_accion_comunal WHERE activo = true`;
    const [comitesCount] = await db`SELECT COUNT(*) AS total FROM comites_gestion_riesgo WHERE activo = true`;
    const [alcaldiasCount] = await db`SELECT COUNT(*) AS total FROM alcaldias WHERE activo = true`;
    const [gobernacionCount] = await db`SELECT COUNT(*) AS total FROM gobernacion_departamental WHERE activo = true`;

    return reply.send({
      socorro: Number(counts.socorro),
      ciudadanos_anonimos: 0,          // sin registro en DB; placeholder
      ciudadanos_registrados: Number(counts.ciudadanos_registrados),
      jal: Number(jalCount.total),
      comites: Number(comitesCount.total),
      alcaldias: Number(alcaldiasCount.total),
      gobernacion: Number(gobernacionCount.total),
    });
  });

  // ── GET /grupos/socorro ──────────────────────────────────────────────────────
  app.get('/grupos/socorro', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden ver este grupo');

    const { organismo_id } = request.query as { organismo_id?: string };

    const rows = await db`
      SELECT p.id, p.email, p.nombre, p.apellido, p.documento, p.celular,
             p.rol, p.municipio_id, p.organismo_id, p.activo, p.created_at,
             o.nombre AS organismo_nombre, o.tipo AS organismo_tipo
      FROM profiles p
      LEFT JOIN organismos o ON o.id = p.organismo_id
      WHERE p.rol = 'SOCORRO'
        AND p.activo = true
        AND (${ organismo_id ? db`p.organismo_id = ${organismo_id}` : db`TRUE` })
      ORDER BY p.apellido, p.nombre
    `;

    return reply.send({ data: rows, total: rows.length });
  });

  // ── GET /grupos/ciudadanos ───────────────────────────────────────────────────
  app.get('/grupos/ciudadanos', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden ver este grupo');

    const { limit: limitStr, offset: offsetStr } = request.query as { limit?: string; offset?: string };
    const limit  = Math.min(parseInt(limitStr  ?? '50',  10), 200);
    const offset = parseInt(offsetStr ?? '0', 10);

    const rows = await db`
      SELECT p.id, p.email, p.nombre, p.apellido, p.documento, p.celular,
             p.rol, p.municipio_id, p.activo, p.created_at,
             m.nombre AS municipio_nombre
      FROM profiles p
      LEFT JOIN municipios m ON m.id = p.municipio_id
      WHERE p.rol = 'CIUDADANO'
        AND p.activo = true
      ORDER BY p.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [{ total }] = await db`
      SELECT COUNT(*) AS total FROM profiles WHERE rol = 'CIUDADANO' AND activo = true
    `;

    return reply.send({ data: rows, total: Number(total), limit, offset });
  });

  // ── GET /grupos/comites ──────────────────────────────────────────────────────
  app.get('/grupos/comites', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden ver este grupo');

    // Perfiles con rol CDGRD (coordinadores de comités departamentales/municipales)
    const rows = await db`
      SELECT p.id, p.email, p.nombre, p.apellido, p.documento, p.celular,
             p.rol, p.municipio_id, p.activo, p.created_at,
             m.nombre AS municipio_nombre
      FROM profiles p
      LEFT JOIN municipios m ON m.id = p.municipio_id
      WHERE p.rol IN ('CDGRD', 'CMGRD')
        AND p.activo = true
      ORDER BY p.rol, p.apellido, p.nombre
    `;

    return reply.send({ data: rows, total: rows.length });
  });
}
