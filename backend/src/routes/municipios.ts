import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { NotFoundError } from '../utils/errors.js';
import { getCached, setCached } from '../middleware/cache.js';

interface MunicipiosQuery {
  departamento?: string;
}

export async function municipiosRoutes(app: FastifyInstance): Promise<void> {
  // GET /municipios — lista todos o filtra por ?departamento=<codigo_dane> (público)
  app.get<{ Querystring: MunicipiosQuery }>('/municipios', async (request, reply) => {
    const { departamento } = request.query;

    const cacheKey = `municipios_${departamento ?? 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) return reply.send(cached);

    const rows = departamento
      ? await db`
          SELECT m.id, m.nombre, m.codigo_dane, m.departamento_id,
                 m.nivel_riesgo_inundacion, m.nivel_riesgo_remocion, m.nivel_riesgo_sismico,
                 m.poblacion, m.area_km2, m.latitud, m.longitud
          FROM municipios m
          JOIN departamentos d ON d.id = m.departamento_id
          WHERE d.codigo_dane = ${departamento}
          ORDER BY m.nombre ASC
        `
      : await db`
          SELECT id, nombre, codigo_dane, departamento_id,
                 nivel_riesgo_inundacion, nivel_riesgo_remocion, nivel_riesgo_sismico,
                 poblacion, area_km2, latitud, longitud
          FROM municipios
          ORDER BY nombre ASC
        `;

    const result = { data: rows, total: rows.length };
    setCached(cacheKey, result, 60000);
    return reply.send(result);
  });

  // GET /municipios/geojson — poligonos con nivel de alerta maximo activo (publico, cacheado)
  app.get('/municipios/geojson', async (_request, reply) => {
    const cacheKey = 'municipios_geojson';
    const cached = getCached(cacheKey);
    if (cached) return reply.send(cached);

    const rows = await db`
      SELECT
        m.id,
        m.nombre,
        m.codigo_dane,
        ST_AsGeoJSON(ST_Simplify(m.geom, 0.001))::json AS geometry,
        (
          SELECT i.nivel_alerta
          FROM incidentes i
          WHERE i.municipio_id = m.id AND i.estado != 'CERRADO'
          ORDER BY
            CASE i.nivel_alerta
              WHEN 'ROJO' THEN 4
              WHEN 'NARANJA' THEN 3
              WHEN 'AMARILLO' THEN 2
              WHEN 'VERDE' THEN 1
              ELSE 0
            END DESC
          LIMIT 1
        ) AS nivel_alerta
      FROM municipios m
      WHERE m.geom IS NOT NULL
    `;

    const geojson = {
      type: 'FeatureCollection',
      features: rows
        .filter((r) => r.geometry)
        .map((r) => ({
          type: 'Feature',
          id: r.id,
          geometry: r.geometry,
          properties: {
            id: r.id,
            nombre: r.nombre,
            codigo_dane: r.codigo_dane,
            nivel_alerta: r.nivel_alerta ?? 'VERDE',
          },
        })),
    };

    setCached(cacheKey, geojson, 60000);
    return reply.send(geojson);
  });

  // GET /municipios/:id — detalle con incidentes activos
  app.get<{ Params: { id: string } }>('/municipios/:id', async (request, reply) => {
    const [muni] = await db`
      SELECT id, nombre, codigo_dane, departamento_id,
             nivel_riesgo_inundacion, nivel_riesgo_remocion, nivel_riesgo_sismico,
             poblacion, area_km2, latitud, longitud
      FROM municipios WHERE id = ${request.params.id}
    `;
    if (!muni) throw new NotFoundError('Municipio');

    const incidentes = await db`
      SELECT id, codigo, titulo, tipo_amenaza, estado, nivel_alerta, fecha_inicio
      FROM incidentes
      WHERE municipio_id = ${request.params.id} AND estado != 'CERRADO'
      ORDER BY fecha_inicio DESC
      LIMIT 20
    `;

    return reply.send({ data: { ...muni, incidentes_activos: incidentes } });
  });
}
