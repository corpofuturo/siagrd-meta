import type { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_DASHBOARD: RolUsuario[] = ['ADMIN', 'CDGRD'];

interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number];
}

function parseGeoJSONCoords(geom: unknown): { lat: number; lng: number } | null {
  if (!geom || typeof geom !== 'object') return null;
  const g = geom as Partial<GeoJSONPoint>;
  if (g.type !== 'Point' || !Array.isArray(g.coordinates)) return null;
  const [lng, lat] = g.coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') return null;
  return { lat, lng };
}

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
        incidentesActivosRes,
        incidentesPorNivelRes,
        alertasActivasRes,
        reportesPendientesRes,
        damnificadosTotalRes,
        recursosDisponiblesRes,
      ] = await Promise.all([
        // 1. Conteo incidentes activos
        supabaseAdmin
          .from('incidentes')
          .select('*', { count: 'exact', head: true })
          .neq('estado', 'CERRADO'),

        // 2. Incidentes agrupados por nivel_alerta (necesitamos los datos para agrupar en app)
        supabaseAdmin
          .from('incidentes')
          .select('nivel_alerta')
          .neq('estado', 'CERRADO'),

        // 3. Alertas activas
        supabaseAdmin
          .from('alertas')
          .select('*', { count: 'exact', head: true })
          .eq('activa', true),

        // 4. Reportes ciudadanos pendientes
        supabaseAdmin
          .from('reportes_ciudadanos')
          .select('*', { count: 'exact', head: true })
          .eq('estado', 'PENDIENTE'),

        // 5. Total damnificados
        supabaseAdmin
          .from('damnificados')
          .select('*', { count: 'exact', head: true }),

        // 6. Suma recursos disponibles
        supabaseAdmin
          .from('recursos_organismo')
          .select('cantidad_disponible')
          .eq('activo', true),
      ]);

      // Agrupar incidentes por nivel_alerta
      const por_nivel: Record<string, number> = {};
      if (incidentesPorNivelRes.data) {
        for (const row of incidentesPorNivelRes.data) {
          const nivel = (row as { nivel_alerta: string }).nivel_alerta;
          por_nivel[nivel] = (por_nivel[nivel] ?? 0) + 1;
        }
      }

      // Sumar recursos disponibles
      let recursos_disponibles = 0;
      if (recursosDisponiblesRes.data) {
        recursos_disponibles = recursosDisponiblesRes.data.reduce(
          (sum, row) => sum + ((row as { cantidad_disponible: number }).cantidad_disponible ?? 0),
          0,
        );
      }

      return reply.send({
        incidentes_activos: incidentesActivosRes.count ?? 0,
        por_nivel_alerta: por_nivel,
        alertas_activas: alertasActivasRes.count ?? 0,
        reportes_pendientes: reportesPendientesRes.count ?? 0,
        damnificados_total: damnificadosTotalRes.count ?? 0,
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

      const [incidentesRes, alertasRes, reportesRes] = await Promise.all([
        // 1. Incidentes activos — campos mínimos
        supabaseAdmin
          .from('incidentes')
          .select('id,tipo_amenaza,nivel_alerta,municipio_id,codigo,titulo,fecha_inicio,ubicacion')
          .neq('estado', 'CERRADO'),

        // 2. Alertas activas
        supabaseAdmin
          .from('alertas')
          .select('id,tipo,nivel,municipios_afectados,titulo')
          .eq('activa', true),

        // 3. Reportes pendientes con ubicación
        supabaseAdmin
          .from('reportes_ciudadanos')
          .select('id,tipo,ubicacion,estado')
          .eq('estado', 'PENDIENTE'),
      ]);

      // Transformar incidentes: parsear coordenadas GeoJSON
      const incidentes = (incidentesRes.data ?? []).map((row) => {
        const r = row as {
          id: string;
          tipo_amenaza: string;
          nivel_alerta: string;
          municipio_id: string;
          codigo: string;
          titulo: string;
          fecha_inicio: string;
          ubicacion: unknown;
        };
        const coords = parseGeoJSONCoords(r.ubicacion);
        return {
          id: r.id,
          tipo_amenaza: r.tipo_amenaza,
          nivel_alerta: r.nivel_alerta,
          municipio_id: r.municipio_id,
          codigo: r.codigo,
          titulo: r.titulo,
          fecha_inicio: r.fecha_inicio,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        };
      });

      // Transformar reportes: parsear coordenadas GeoJSON
      const reportes = (reportesRes.data ?? []).map((row) => {
        const r = row as { id: string; tipo: string; ubicacion: unknown; estado: string };
        const coords = parseGeoJSONCoords(r.ubicacion);
        return {
          id: r.id,
          tipo: r.tipo,
          estado: r.estado,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        };
      });

      return reply.send({
        incidentes,
        alertas: alertasRes.data ?? [],
        reportes,
      });
    },
  );
}
