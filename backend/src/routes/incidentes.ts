import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_ESCRITURA: RolUsuario[] = ['CDGRD', 'CMGRD', 'SOCORRO'];
const ROLES_ADMIN: RolUsuario[] = ['ADMIN', 'CDGRD'];

export async function incidentesRoutes(app: FastifyInstance): Promise<void> {
  // GET /incidentes — listar con filtros
  app.get(
    '/incidentes',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { estado, tipo } = request.query as { estado?: string; tipo?: string };
      const user = request.user!;

      const rows = await db`
        SELECT * FROM incidentes
        WHERE TRUE
          ${!ROLES_ADMIN.includes(user.rol) && user.municipio_id
            ? db`AND municipio_id = ${user.municipio_id}`
            : db``}
          ${estado ? db`AND estado = ${estado}` : db``}
          ${tipo ? db`AND tipo_amenaza = ${tipo}` : db``}
        ORDER BY created_at DESC
      `;

      return reply.send({ data: rows, total: rows.length });
    },
  );

  // GET /incidentes/cercanos — búsqueda geoespacial
  app.get(
    '/incidentes/cercanos',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { lat, lng, radio_km } = request.query as {
        lat?: string;
        lng?: string;
        radio_km?: string;
      };

      if (!lat || !lng) throw new ValidationError('lat y lng son requeridos');

      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const radioNum = radio_km ? parseFloat(radio_km) : 10;

      if (isNaN(latNum) || isNaN(lngNum)) {
        throw new ValidationError('lat y lng deben ser números válidos');
      }

      if (latNum < -90 || latNum > 90) throw new ValidationError('lat debe estar entre -90 y 90');
      if (lngNum < -180 || lngNum > 180) throw new ValidationError('lng debe estar entre -180 y 180');

      const fueraDeColombia =
        latNum < -4.5 || latNum > 13.0 || lngNum < -82 || lngNum > -66;
      if (fueraDeColombia) {
        request.log.warn({ lat: latNum, lng: lngNum }, 'Coordenadas fuera del territorio colombiano');
      }

      const rows = await db`
        SELECT *,
          ST_Distance(
            ubicacion::geography,
            ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography
          ) / 1000 AS distancia_km
        FROM incidentes
        WHERE ST_DWithin(
          ubicacion::geography,
          ST_SetSRID(ST_MakePoint(${lngNum}, ${latNum}), 4326)::geography,
          ${radioNum * 1000}
        )
        ORDER BY distancia_km ASC
      `;

      return reply.send({ data: rows, radio_km: radioNum });
    },
  );

  // GET /cerca — incidentes cercanos activos con PostGIS
  app.get(
    '/cerca',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { lat, lng, radio_km } = request.query as {
        lat?: string;
        lng?: string;
        radio_km?: string;
      };

      if (!lat || !lng) throw new ValidationError('lat y lng son requeridos');

      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      let radioNum = radio_km ? parseFloat(radio_km) : 50;

      if (isNaN(latNum) || isNaN(lngNum)) {
        throw new ValidationError('lat y lng deben ser números válidos');
      }
      if (isNaN(radioNum) || radioNum <= 0) throw new ValidationError('radio_km debe ser un número positivo');
      if (radioNum > 200) radioNum = 200;

      const radioMetros = radioNum * 1000;

      const rows = await db`
        SELECT i.*,
          ST_Distance(i.ubicacion::geography, ST_MakePoint(${lngNum}, ${latNum})::geography) / 1000 AS distancia_km
        FROM incidentes i
        WHERE ST_DWithin(i.ubicacion::geography, ST_MakePoint(${lngNum}, ${latNum})::geography, ${radioMetros})
          AND i.estado NOT IN ('CERRADO', 'FALSA_ALARMA')
        ORDER BY distancia_km ASC
        LIMIT 50
      `;

      return reply.send({ data: rows, total: rows.length, radio_km: radioNum });
    },
  );

  // GET /incidentes/:id — detalle
  app.get(
    '/incidentes/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const [row] = await db`SELECT * FROM incidentes WHERE id = ${id}`;
      if (!row) throw new NotFoundError('Incidente');

      if (!ROLES_ADMIN.includes(user.rol) && user.municipio_id && row.municipio_id !== user.municipio_id) {
        throw new ForbiddenError('No tiene acceso a este incidente');
      }

      return reply.send(row);
    },
  );

  // POST /incidentes — crear
  app.post(
    '/incidentes',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;

      if (!ROLES_ESCRITURA.includes(user.rol)) {
        throw new ForbiddenError('Solo CDGRD, CMGRD y SOCORRO pueden crear incidentes');
      }

      const {
        tipo_amenaza,
        descripcion,
        lat,
        lng,
        nivel_alerta,
        municipio_id,
        titulo,
      } = request.body as {
        tipo_amenaza: string;
        descripcion?: string;
        lat: number;
        lng: number;
        nivel_alerta: string;
        municipio_id: string;
        titulo: string;
      };

      const [row] = await db`
        INSERT INTO incidentes (
          tipo_amenaza, descripcion, nivel_alerta, municipio_id, titulo,
          reportado_por, ubicacion, estado, fecha_inicio, created_at, updated_at
        )
        VALUES (
          ${tipo_amenaza}, ${descripcion ?? null}, ${nivel_alerta}, ${municipio_id}, ${titulo},
          ${user.id},
          ST_GeomFromText(${`POINT(${lng} ${lat})`}, 4326),
          'ACTIVO',
          NOW(), NOW(), NOW()
        )
        RETURNING *
      `;

      return reply.status(201).send(row);
    },
  );

  // PATCH /incidentes/:id — actualizar
  app.patch(
    '/incidentes/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const [incidente] = await db`
        SELECT municipio_id, reportado_por FROM incidentes WHERE id = ${id}
      `;
      if (!incidente) throw new NotFoundError('Incidente');

      const esPropietario = incidente.reportado_por === user.id;
      const esMismoMunicipio = !user.municipio_id || incidente.municipio_id === user.municipio_id;

      if (user.rol === 'CIUDADANO') {
        throw new ForbiddenError('Ciudadanos no pueden modificar incidentes');
      }
      if (!ROLES_ADMIN.includes(user.rol) && !esMismoMunicipio) {
        throw new ForbiddenError('No tiene permisos sobre incidentes de otro municipio');
      }
      if (user.rol === 'SOCORRO' && !esPropietario && !esMismoMunicipio) {
        throw new ForbiddenError('Socorro solo puede modificar sus propios incidentes');
      }

      const { estado, nivel_alerta } = request.body as {
        estado?: string;
        nivel_alerta?: string;
      };

      const [updated] = await db`
        UPDATE incidentes
        SET
          ${estado ? db`estado = ${estado},` : db``}
          ${nivel_alerta ? db`nivel_alerta = ${nivel_alerta},` : db``}
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return reply.send(updated);
    },
  );
}
