import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_DASHBOARD: RolUsuario[] = ['ADMIN', 'CDGRD'];

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  // GET /dashboard/stats
  app.get(
    '/dashboard/stats',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_DASHBOARD.includes(user.rol)) {
        throw new ForbiddenError('Solo roles ADMIN y CDGRD pueden acceder al dashboard');
      }

      const [
        [{ count: incidentes_activos }],
        niveles,
        [{ count: alertas_activas }],
        [{ count: reportes_pendientes }],
        [{ count: damnificados_total }],
        recursos,
      ] = await Promise.all([
        db`SELECT COUNT(*)::int AS count FROM incidentes WHERE estado <> 'CERRADO'`,
        db`SELECT nivel_alerta FROM incidentes WHERE estado <> 'CERRADO'`,
        db`SELECT COUNT(*)::int AS count FROM alertas WHERE activa = true`,
        db`SELECT COUNT(*)::int AS count FROM reportes_ciudadanos WHERE estado = 'PENDIENTE'`,
        db`SELECT COUNT(*)::int AS count FROM damnificados`,
        db`SELECT cantidad_disponible FROM recursos_organismo WHERE activo = true`,
      ]);

      const por_nivel_alerta: Record<string, number> = {};
      for (const row of (niveles as unknown) as { nivel_alerta: string }[]) {
        const n = row.nivel_alerta;
        por_nivel_alerta[n] = (por_nivel_alerta[n] ?? 0) + 1;
      }

      const recursos_disponibles = ((recursos as unknown) as { cantidad_disponible: number }[]).reduce(
        (sum, r) => sum + (r.cantidad_disponible ?? 0),
        0,
      );

      return reply.send({
        incidentes_activos,
        por_nivel_alerta,
        alertas_activas,
        reportes_pendientes,
        damnificados_total,
        recursos_disponibles,
        timestamp: new Date().toISOString(),
      });
    },
  );

  // GET /dashboard/mapa-datos
  app.get(
    '/dashboard/mapa-datos',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_DASHBOARD.includes(user.rol)) {
        throw new ForbiddenError('Solo roles ADMIN y CDGRD pueden acceder al dashboard');
      }

      const [incidentesRows, alertasRows, reportesRows] = await Promise.all([
        db`
          SELECT id, tipo_amenaza, nivel_alerta, municipio_id, codigo, titulo, fecha_inicio,
            ST_Y(ubicacion::geometry) AS lat,
            ST_X(ubicacion::geometry) AS lng
          FROM incidentes
          WHERE estado <> 'CERRADO'
        `,
        db`
          SELECT id, tipo, nivel, municipios_afectados, titulo
          FROM alertas
          WHERE activa = true
        `,
        db`
          SELECT id, tipo, estado,
            ST_Y(ubicacion::geometry) AS lat,
            ST_X(ubicacion::geometry) AS lng
          FROM reportes_ciudadanos
          WHERE estado = 'PENDIENTE'
        `,
      ]);

      return reply.send({
        incidentes: incidentesRows,
        alertas: alertasRows,
        reportes: reportesRows,
      });
    },
  );
}
