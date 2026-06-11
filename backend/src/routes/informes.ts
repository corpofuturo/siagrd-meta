import type { FastifyInstance } from 'fastify';
import { createHash } from 'crypto';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_INFORME: RolUsuario[] = ['CMGRD', 'CDGRD', 'ADMIN'];

async function assertIncidenteExists(id: string): Promise<void> {
  const [row] = await db`SELECT id FROM incidentes WHERE id = ${id}`;
  if (!row) throw new NotFoundError(`Incidente ${id} no encontrado`);
}

export async function informesRoutes(app: FastifyInstance): Promise<void> {
  // ---------------------------------------------------------------------------
  // GET /incidentes/:id/informe
  // Obtiene el informe del evento; crea un borrador si no existe.
  // ---------------------------------------------------------------------------
  app.get(
    '/incidentes/:id/informe',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await assertIncidenteExists(id);

      let [informe] = await db`SELECT * FROM informes_evento WHERE incidente_id = ${id}`;

      if (!informe) {
        [informe] = await db`
          INSERT INTO informes_evento (incidente_id)
          VALUES (${id})
          RETURNING *
        `;
      }

      return reply.send({ data: informe });
    },
  );

  // ---------------------------------------------------------------------------
  // PATCH /incidentes/:id/informe
  // Actualiza campos del informe. Solo CMGRD/CDGRD/ADMIN.
  // ---------------------------------------------------------------------------
  app.patch(
    '/incidentes/:id/informe',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      if (!ROLES_INFORME.includes(user.rol)) {
        throw new ForbiddenError('Solo CMGRD, CDGRD o ADMIN pueden actualizar el informe');
      }

      await assertIncidenteExists(id);

      const body = request.body as Record<string, unknown>;

      const CAMPOS_PERMITIDOS = [
        'cronologia',
        'organismos_participantes',
        'recursos_usados',
        'total_afectados',
        'total_evacuados',
        'danos',
        'lecciones_aprendidas',
      ] as const;

      const updates: Record<string, unknown> = {};
      for (const campo of CAMPOS_PERMITIDOS) {
        if (campo in body) {
          updates[campo] = body[campo];
        }
      }

      if (Object.keys(updates).length === 0) {
        throw new ValidationError('No se proporcionó ningún campo actualizable');
      }

      // Asegurarse de que existe el informe antes de actualizar
      const [existing] = await db`SELECT id, estado_informe FROM informes_evento WHERE incidente_id = ${id}`;
      if (!existing) {
        throw new NotFoundError('Informe no encontrado — solicite primero GET para crear el borrador');
      }

      if (existing.estado_informe === 'FIRMADO' || existing.estado_informe === 'PUBLICADO') {
        throw new ForbiddenError('No se puede editar un informe ya firmado o publicado');
      }

      const [updated] = await db`
        UPDATE informes_evento
        SET
          ${db(updates)},
          updated_at = NOW()
        WHERE incidente_id = ${id}
        RETURNING *
      `;

      return reply.send({ data: updated });
    },
  );

  // ---------------------------------------------------------------------------
  // POST /incidentes/:id/informe/firmar
  // Firma el informe generando hash SHA-256. Solo CMGRD/CDGRD/ADMIN.
  // PDF: DEUDA TÉCNICA DT-005 — ver TECH_DEBT.md
  // ---------------------------------------------------------------------------
  app.post(
    '/incidentes/:id/informe/firmar',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      if (!ROLES_INFORME.includes(user.rol)) {
        throw new ForbiddenError('Solo CMGRD, CDGRD o ADMIN pueden firmar el informe');
      }

      await assertIncidenteExists(id);

      const [informe] = await db`SELECT * FROM informes_evento WHERE incidente_id = ${id}`;

      if (!informe) {
        throw new NotFoundError('Informe no encontrado — solicite primero GET para crear el borrador');
      }

      if (informe.estado_informe === 'FIRMADO' || informe.estado_informe === 'PUBLICADO') {
        throw new ValidationError('El informe ya fue firmado');
      }

      // Generar hash SHA-256 del contenido JSON del informe
      const contenidoFirma = {
        incidente_id: informe.incidente_id,
        cronologia: informe.cronologia,
        organismos_participantes: informe.organismos_participantes,
        recursos_usados: informe.recursos_usados,
        total_afectados: informe.total_afectados,
        total_evacuados: informe.total_evacuados,
        danos: informe.danos,
        lecciones_aprendidas: informe.lecciones_aprendidas,
        firmado_por: user.id,
        firmado_at: new Date().toISOString(),
      };

      const hash = createHash('sha256')
        .update(JSON.stringify(contenidoFirma))
        .digest('hex');

      const [firmado] = await db`
        UPDATE informes_evento
        SET
          firmado_por    = ${user.id},
          firmado_at     = NOW(),
          hash_documento = ${hash},
          estado_informe = 'FIRMADO',
          updated_at     = NOW()
        WHERE incidente_id = ${id}
        RETURNING *
      `;

      // NOTA: Generación de PDF no implementada — DT-005 en TECH_DEBT.md
      return reply.status(200).send({ data: firmado });
    },
  );

  // ---------------------------------------------------------------------------
  // GET /incidentes/:id/participantes
  // Lista organismos que participaron en el evento.
  // ---------------------------------------------------------------------------
  app.get(
    '/incidentes/:id/participantes',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await assertIncidenteExists(id);

      const rows = await db`
        SELECT
          p.*,
          o.nombre  AS organismo_nombre,
          o.tipo    AS organismo_tipo
        FROM participacion_organismo p
        JOIN organismos o ON o.id = p.organismo_id
        WHERE p.incidente_id = ${id}
        ORDER BY p.created_at ASC
      `;

      return reply.send({ data: rows, total: rows.length });
    },
  );

  // ---------------------------------------------------------------------------
  // POST /incidentes/:id/participantes
  // Registra participación de organismo. Solo el propio organismo o CDGRD/ADMIN.
  // ---------------------------------------------------------------------------
  app.post(
    '/incidentes/:id/participantes',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      await assertIncidenteExists(id);

      const body = request.body as {
        organismo_id?: string;
        rol_en_evento?: string;
        hora_activacion?: string;
        hora_arribo?: string;
        hora_retiro?: string;
        personal_desplegado?: number;
        reporte_actividades?: string;
        recursos_aportados?: Record<string, unknown>;
      };

      const organismoId = body.organismo_id;
      if (!organismoId) throw new ValidationError('organismo_id es requerido');

      // Solo el organismo mismo o CDGRD/ADMIN pueden registrar
      const esPropioOrganismo = user.organismo_id === organismoId;
      const esAdminOCdgrd = (['CDGRD', 'ADMIN'] as RolUsuario[]).includes(user.rol);

      if (!esPropioOrganismo && !esAdminOCdgrd) {
        throw new ForbiddenError('Solo el propio organismo, CDGRD o ADMIN pueden registrar participación');
      }

      // Verificar que el organismo existe
      const [org] = await db`SELECT id FROM organismos WHERE id = ${organismoId}`;
      if (!org) throw new NotFoundError(`Organismo ${organismoId} no encontrado`);

      // Evitar duplicado
      const [dup] = await db`
        SELECT id FROM participacion_organismo
        WHERE incidente_id = ${id} AND organismo_id = ${organismoId}
      `;
      if (dup) throw new ValidationError('Este organismo ya está registrado en el evento');

      const [nueva] = await db`
        INSERT INTO participacion_organismo (
          incidente_id,
          organismo_id,
          rol_en_evento,
          hora_activacion,
          hora_arribo,
          hora_retiro,
          personal_desplegado,
          reporte_actividades,
          recursos_aportados
        ) VALUES (
          ${id},
          ${organismoId},
          ${body.rol_en_evento ?? null},
          ${body.hora_activacion ?? null},
          ${body.hora_arribo ?? null},
          ${body.hora_retiro ?? null},
          ${body.personal_desplegado ?? null},
          ${body.reporte_actividades ?? null},
          ${body.recursos_aportados ? JSON.stringify(body.recursos_aportados) : '{}'}
        )
        RETURNING *
      `;

      return reply.status(201).send({ data: nueva });
    },
  );

  // ---------------------------------------------------------------------------
  // PATCH /incidentes/:id/participantes/:orgId
  // Actualiza el reporte de actividades de un organismo participante.
  // Solo el propio organismo o CDGRD/ADMIN.
  // ---------------------------------------------------------------------------
  app.patch(
    '/incidentes/:id/participantes/:orgId',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id, orgId } = request.params as { id: string; orgId: string };
      const user = request.user!;

      await assertIncidenteExists(id);

      const esPropioOrganismo = user.organismo_id === orgId;
      const esAdminOCdgrd = (['CDGRD', 'ADMIN'] as RolUsuario[]).includes(user.rol);

      if (!esPropioOrganismo && !esAdminOCdgrd) {
        throw new ForbiddenError('Solo el propio organismo, CDGRD o ADMIN pueden actualizar la participación');
      }

      const [participacion] = await db`
        SELECT id FROM participacion_organismo
        WHERE incidente_id = ${id} AND organismo_id = ${orgId}
      `;
      if (!participacion) throw new NotFoundError('Participación no encontrada');

      const body = request.body as {
        rol_en_evento?: string;
        hora_activacion?: string;
        hora_arribo?: string;
        hora_retiro?: string;
        personal_desplegado?: number;
        reporte_actividades?: string;
        recursos_aportados?: Record<string, unknown>;
      };

      const CAMPOS_PERMITIDOS = [
        'rol_en_evento',
        'hora_activacion',
        'hora_arribo',
        'hora_retiro',
        'personal_desplegado',
        'reporte_actividades',
        'recursos_aportados',
      ] as const;

      const updates: Record<string, unknown> = {};
      for (const campo of CAMPOS_PERMITIDOS) {
        if (campo in body) {
          updates[campo] = body[campo];
        }
      }

      if (Object.keys(updates).length === 0) {
        throw new ValidationError('No se proporcionó ningún campo actualizable');
      }

      const [updated] = await db`
        UPDATE participacion_organismo
        SET ${db(updates)}
        WHERE incidente_id = ${id} AND organismo_id = ${orgId}
        RETURNING *
      `;

      return reply.send({ data: updated });
    },
  );
}
