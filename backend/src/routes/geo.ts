import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { getCached, setCached } from '../middleware/cache.js';

// ARQ-DT-007: contrato publico { departamento, municipios: [{id, nombre, codigo_dane, geojson}] }
// Complementa (no reemplaza) a GET /municipios/geojson, que ya devuelve un
// FeatureCollection listo para el mapa con nivel de alerta por municipio.
export async function geoRoutes(app: FastifyInstance): Promise<void> {
  app.get('/geo/departamento', async (_request, reply) => {
    const cacheKey = 'geo_departamento';
    const cached = getCached(cacheKey);
    if (cached) return reply.send(cached);

    const municipios = await db`
      SELECT
        id,
        nombre,
        codigo_dane,
        ST_AsGeoJSON(ST_Simplify(geom, 0.001))::json AS geojson
      FROM municipios
      WHERE departamento_id = (SELECT id FROM departamentos WHERE codigo_dane = '50')
      ORDER BY nombre
    `;

    const result = { departamento: 'Meta', municipios };
    setCached(cacheKey, result, 86400000); // 24h — la geografia no cambia en el dia a dia
    return reply.send(result);
  });
}
