import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_ESTADISTICAS: RolUsuario[] = ['ADMIN', 'CDGRD', 'CMGRD'];

export async function estadisticasRoutes(app: FastifyInstance): Promise<void> {
  // GET /estadisticas/por-tipo?año=2024&municipio_id=
  app.get(
    '/estadisticas/por-tipo',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_ESTADISTICAS.includes(user.rol)) {
        throw new ForbiddenError('Sin acceso a estadísticas');
      }

      const { año, municipio_id } = request.query as { año?: string; municipio_id?: string };
      const anioNum = año ? parseInt(año, 10) : new Date().getFullYear();

      const rows = await db`
        SELECT
          tipo_amenaza AS tipo,
          EXTRACT(MONTH FROM fecha_inicio)::int AS mes,
          ${anioNum} AS año,
          COUNT(*)::int AS total
        FROM incidentes
        WHERE EXTRACT(YEAR FROM fecha_inicio) = ${anioNum}
          ${municipio_id ? db`AND municipio_id = ${municipio_id}` : db``}
          ${!['ADMIN', 'CDGRD'].includes(user.rol) && user.municipio_id
            ? db`AND municipio_id = ${user.municipio_id}`
            : db``}
        GROUP BY tipo_amenaza, EXTRACT(MONTH FROM fecha_inicio)
        ORDER BY mes ASC, tipo ASC
      `;

      return reply.send({ data: rows, total: rows.length });
    },
  );

  // GET /estadisticas/por-municipio?tipo=INUNDACION
  app.get(
    '/estadisticas/por-municipio',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_ESTADISTICAS.includes(user.rol)) {
        throw new ForbiddenError('Sin acceso a estadísticas');
      }

      const { tipo } = request.query as { tipo?: string };

      const rows = await db`
        SELECT
          m.nombre AS municipio_nombre,
          m.codigo_dane AS municipio_codigo,
          COUNT(i.id)::int AS total,
          AVG(ST_Y(i.ubicacion::geometry)) AS lat,
          AVG(ST_X(i.ubicacion::geometry)) AS lng
        FROM municipios m
        LEFT JOIN incidentes i ON i.municipio_id = m.id
          ${tipo ? db`AND i.tipo_amenaza = ${tipo}` : db``}
        GROUP BY m.id, m.nombre, m.codigo_dane
        HAVING COUNT(i.id) > 0
        ORDER BY total DESC
      `;

      return reply.send({ data: rows, total: rows.length });
    },
  );

  // GET /estadisticas/tiempos-respuesta?año=2024
  app.get(
    '/estadisticas/tiempos-respuesta',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_ESTADISTICAS.includes(user.rol)) {
        throw new ForbiddenError('Sin acceso a estadísticas');
      }

      const { año } = request.query as { año?: string };
      const anioNum = año ? parseInt(año, 10) : new Date().getFullYear();

      // Calcula tiempo entre transiciones usando transiciones_evento
      const rows = await db`
        SELECT
          i.tipo_amenaza AS tipo,
          ROUND(
            AVG(
              EXTRACT(EPOCH FROM (t2.created_at - t1.created_at)) / 3600
            )::numeric, 2
          ) AS pendiente_a_confirmado_horas,
          ROUND(
            AVG(
              EXTRACT(EPOCH FROM (t3.created_at - t2.created_at)) / 3600
            )::numeric, 2
          ) AS confirmado_a_encurso_horas,
          ROUND(
            AVG(
              EXTRACT(EPOCH FROM (t4.created_at - t3.created_at)) / 3600
            )::numeric, 2
          ) AS encurso_a_cerrado_horas,
          COUNT(DISTINCT i.id)::int AS total_incidentes
        FROM incidentes i
        LEFT JOIN transiciones_evento t1
          ON t1.incidente_id = i.id AND t1.estado_origen = 'PENDIENTE' AND t1.estado_destino = 'CONFIRMADO'
        LEFT JOIN transiciones_evento t2
          ON t2.incidente_id = i.id AND t2.estado_origen = 'CONFIRMADO' AND t2.estado_destino = 'EN_CURSO'
        LEFT JOIN transiciones_evento t3
          ON t3.incidente_id = i.id AND t3.estado_origen = 'EN_CURSO' AND t3.estado_destino = 'CERRADO'
        LEFT JOIN transiciones_evento t4
          ON t4.incidente_id = i.id AND t4.estado_origen = 'CERRADO'
        WHERE EXTRACT(YEAR FROM i.fecha_inicio) = ${anioNum}
        GROUP BY i.tipo_amenaza
        ORDER BY i.tipo_amenaza
      `;

      return reply.send({ data: rows, año: anioNum });
    },
  );

  // GET /estadisticas/tendencias?tipo=INUNDACION
  app.get(
    '/estadisticas/tendencias',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_ESTADISTICAS.includes(user.rol)) {
        throw new ForbiddenError('Sin acceso a estadísticas');
      }

      const { tipo } = request.query as { tipo?: string };
      const anioActual = new Date().getFullYear();
      const anioDesde = anioActual - 4;

      const rows = await db`
        SELECT
          EXTRACT(YEAR FROM fecha_inicio)::int AS año,
          EXTRACT(MONTH FROM fecha_inicio)::int AS mes,
          COUNT(*)::int AS total
        FROM incidentes
        WHERE fecha_inicio >= ${`${anioDesde}-01-01`}::date
          ${tipo ? db`AND tipo_amenaza = ${tipo}` : db``}
          ${!['ADMIN', 'CDGRD'].includes(user.rol) && user.municipio_id
            ? db`AND municipio_id = ${user.municipio_id}`
            : db``}
        GROUP BY EXTRACT(YEAR FROM fecha_inicio), EXTRACT(MONTH FROM fecha_inicio)
        ORDER BY año ASC, mes ASC
      `;

      // Calcular variación año anterior por mes
      const porAnio: Record<number, Record<number, number>> = {};
      for (const r of rows as unknown as { año: number; mes: number; total: number }[]) {
        if (!porAnio[r.año]) porAnio[r.año] = {};
        porAnio[r.año][r.mes] = r.total;
      }

      const conVariacion = (rows as unknown as { año: number; mes: number; total: number }[]).map((r) => {
        const totalAnterior = porAnio[r.año - 1]?.[r.mes] ?? null;
        const variacion =
          totalAnterior !== null && totalAnterior > 0
            ? Math.round(((r.total - totalAnterior) / totalAnterior) * 100)
            : null;
        return { ...r, total_año_anterior: totalAnterior, variacion_pct: variacion };
      });

      return reply.send({ data: conVariacion, desde_año: anioDesde, hasta_año: anioActual });
    },
  );

  // GET /estadisticas/resumen
  app.get(
    '/estadisticas/resumen',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_ESTADISTICAS.includes(user.rol)) {
        throw new ForbiddenError('Sin acceso a estadísticas');
      }

      const anioActual = new Date().getFullYear();

      const [
        porEstado,
        tiempoRespuestaRows,
        organismosMasActivos,
        municipioMasAfectado,
      ] = await Promise.all([
        db`
          SELECT estado, COUNT(*)::int AS total
          FROM incidentes
          WHERE EXTRACT(YEAR FROM fecha_inicio) = ${anioActual}
          GROUP BY estado
          ORDER BY total DESC
        `,
        db`
          SELECT ROUND(
            AVG(
              EXTRACT(EPOCH FROM (t_conf.created_at - i.fecha_inicio)) / 3600
            )::numeric, 2
          ) AS tiempo_promedio_horas
          FROM incidentes i
          JOIN transiciones_evento t_conf
            ON t_conf.incidente_id = i.id
            AND t_conf.estado_destino = 'CONFIRMADO'
          WHERE EXTRACT(YEAR FROM i.fecha_inicio) = ${anioActual}
        `,
        db`
          SELECT
            p.email AS organismo_email,
            COUNT(t.id)::int AS acciones
          FROM transiciones_evento t
          JOIN profiles p ON p.id = t.actor_id
          WHERE EXTRACT(YEAR FROM t.created_at) = ${anioActual}
          GROUP BY p.id, p.email
          ORDER BY acciones DESC
          LIMIT 5
        `,
        db`
          SELECT
            m.nombre AS municipio_nombre,
            COUNT(i.id)::int AS total
          FROM incidentes i
          JOIN municipios m ON m.id = i.municipio_id
          WHERE EXTRACT(YEAR FROM i.fecha_inicio) = ${anioActual}
          GROUP BY m.id, m.nombre
          ORDER BY total DESC
          LIMIT 1
        `,
      ]);

      const estadoMap: Record<string, number> = {};
      let totalAnio = 0;
      for (const r of porEstado as unknown as { estado: string; total: number }[]) {
        estadoMap[r.estado] = r.total;
        totalAnio += r.total;
      }

      const tiempoPromedio = (tiempoRespuestaRows[0] as { tiempo_promedio_horas: number | null })
        ?.tiempo_promedio_horas ?? null;

      return reply.send({
        año: anioActual,
        total_eventos_año: totalAnio,
        por_estado: estadoMap,
        tiempo_respuesta_promedio_horas: tiempoPromedio,
        organismos_mas_activos: organismosMasActivos,
        municipio_mas_afectado: municipioMasAfectado[0] ?? null,
      });
    },
  );
}
