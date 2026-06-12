import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_ADMIN: RolUsuario[] = ['ADMIN', 'CDGRD'];

export async function configuracionRoutes(app: FastifyInstance): Promise<void> {

  // ── GET /configuracion ───────────────────────────────────────────────────────
  app.get('/configuracion', async (_request, reply) => {
    const [row] = await db`
      SELECT c.*, m.nombre AS municipio_nombre_join
      FROM configuracion c
      LEFT JOIN municipios m ON m.id = c.departamento_id
      LIMIT 1
    `;
    return reply.send(row ?? null);
  });

  // ── PATCH /configuracion ─────────────────────────────────────────────────────
  app.patch('/configuracion', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN puede modificar la configuración');

    const body = request.body as Record<string, unknown>;
    const allowed = [
      'nombre_sistema',
      'departamento_id',
      'nombre_departamento',
      'codigo_dane',
      'ungrd_correo',
      'ungrd_url',
      'activo',
    ];

    const updates: Record<string, unknown> = {};
    for (const k of allowed) {
      if (body[k] !== undefined) updates[k] = body[k];
    }
    if (Object.keys(updates).length === 0) throw new ValidationError('Sin campos para actualizar');

    // Validar que departamento_id exista en tabla departamentos
    if (updates.departamento_id) {
      const [dep] = await db`SELECT id FROM departamentos WHERE id = ${updates.departamento_id as string}`;
      if (!dep) throw new NotFoundError('departamento_id no existe en la tabla departamentos');
    }

    updates.updated_at = new Date();

    // Upsert: si no existe fila, insertar; si existe, actualizar
    const [existing] = await db`SELECT id FROM configuracion LIMIT 1`;

    let result: Record<string, unknown>;

    if (existing) {
      const sets = Object.entries(updates).map(([k, v]) => db`${db(k)} = ${v as any}`);
      const [updated] = await db`
        UPDATE configuracion
        SET ${sets.reduce((a, b) => db`${a}, ${b}`)}
        WHERE id = ${existing.id}
        RETURNING *
      `;
      result = updated;
    } else {
      // Insertar con defaults para campos no provistos
      const fields = ['nombre_sistema', 'departamento_id', 'nombre_departamento', 'codigo_dane', 'ungrd_correo', 'ungrd_url', 'activo', 'created_at', 'updated_at'];
      const values = {
        nombre_sistema: (body.nombre_sistema as string | undefined) ?? 'SIAGRD',
        departamento_id: (body.departamento_id as string | undefined) ?? null,
        nombre_departamento: (body.nombre_departamento as string | undefined) ?? null,
        codigo_dane: (body.codigo_dane as string | undefined) ?? null,
        ungrd_correo: (body.ungrd_correo as string | undefined) ?? null,
        ungrd_url: (body.ungrd_url as string | undefined) ?? null,
        activo: (body.activo as boolean | undefined) ?? true,
      };
      const [inserted] = await db`
        INSERT INTO configuracion (${db(fields)})
        VALUES (
          ${values.nombre_sistema},
          ${values.departamento_id},
          ${values.nombre_departamento},
          ${values.codigo_dane},
          ${values.ungrd_correo},
          ${values.ungrd_url},
          ${values.activo},
          NOW(), NOW()
        )
        RETURNING *
      `;
      result = inserted;
    }

    return reply.send(result);
  });

  // ── POST /configuracion/informe-ungrd ────────────────────────────────────────
  app.post('/configuracion/informe-ungrd', { preHandler: authMiddleware }, async (request, reply) => {
    const user = request.user!;
    if (!ROLES_ADMIN.includes(user.rol)) throw new ForbiddenError('Solo ADMIN/CDGRD pueden generar informes UNGRD');

    const [config] = await db`SELECT * FROM configuracion LIMIT 1`;

    const desde = new Date();
    desde.setDate(desde.getDate() - 30);

    const [stats] = await db`
      SELECT
        COUNT(*)                                                    AS total_incidentes,
        COUNT(*) FILTER (WHERE estado = 'CERRADO')                  AS cerrados,
        COUNT(*) FILTER (WHERE estado = 'FALSO_POSITIVO')           AS falsos_positivos,
        COUNT(*) FILTER (WHERE estado IN ('EN_CURSO','CONFIRMADO','PENDIENTE')) AS activos,
        COUNT(*) FILTER (WHERE estado = 'CONTROLADO')               AS controlados
      FROM incidentes
      WHERE created_at >= ${desde}
    `;

    const eventos = await db`
      SELECT i.id, i.codigo, i.titulo, i.tipo_amenaza, i.estado,
             i.nivel_alerta, i.municipio_id,
             m.nombre AS municipio_nombre,
             i.fecha_inicio, i.created_at
      FROM incidentes i
      LEFT JOIN municipios m ON m.id = i.municipio_id
      WHERE i.created_at >= ${desde}
      ORDER BY i.created_at DESC
      LIMIT 200
    `;

    const payload = {
      periodo: {
        desde: desde.toISOString(),
        hasta: new Date().toISOString(),
      },
      entidad: {
        nombre_sistema: config?.nombre_sistema ?? 'SIAGRD',
        departamento: config?.nombre_departamento ?? null,
        codigo_dane: config?.codigo_dane ?? null,
      },
      estadisticas: stats,
      eventos,
      generado_por: user.id,
      generado_en: new Date().toISOString(),
    };

    app.log.info({ informe_ungrd: true, ungrd_correo: config?.ungrd_correo }, 'Informe UNGRD generado');

    return reply.send(payload);
  });
}
