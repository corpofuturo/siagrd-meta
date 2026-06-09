import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { NotFoundError } from '../utils/errors.js';

export async function municipiosRoutes(app: FastifyInstance): Promise<void> {
  // GET /municipios — lista todos (público, para selects en formularios)
  app.get('/municipios', async (_request, reply) => {
    const rows = await db`
      SELECT id, nombre, codigo_dane, departamento_id,
             nivel_riesgo_inundacion, nivel_riesgo_remocion, nivel_riesgo_sismico,
             poblacion, area_km2
      FROM municipios
      ORDER BY nombre ASC
    `;
    return reply.send({ data: rows, total: rows.length });
  });

  // GET /municipios/:id — detalle con incidentes activos
  app.get<{ Params: { id: string } }>('/municipios/:id', async (request, reply) => {
    const [muni] = await db`
      SELECT id, nombre, codigo_dane, departamento_id,
             nivel_riesgo_inundacion, nivel_riesgo_remocion, nivel_riesgo_sismico,
             poblacion, area_km2
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
