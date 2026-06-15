import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import { enviarAlertaPush } from '../services/notifications.service.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_GESTION: RolUsuario[] = ['ADMIN', 'CDGRD'];

export async function alertasRoutes(app: FastifyInstance): Promise<void> {
  // GET /alertas — público, filtro opcional por activa, paginación
  app.get('/alertas', async (request, reply) => {
    const { activa, limit, offset } = request.query as {
      activa?: string;
      limit?: string;
      offset?: string;
    };

    const soloActivas = activa === undefined || activa === 'true';
    const limitNum  = Math.min(limit  ? parseInt(limit,  10) : 100, 500);
    const offsetNum = offset ? Math.max(parseInt(offset, 10), 0) : 0;

    const [{ count }] = soloActivas
      ? await db`SELECT COUNT(*)::int AS count FROM alertas WHERE activa = true`
      : await db`SELECT COUNT(*)::int AS count FROM alertas`;

    const rows = soloActivas
      ? await db`SELECT * FROM alertas WHERE activa = true  ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`
      : await db`SELECT * FROM alertas                      ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    return reply.send({ data: rows, total: count, limit: limitNum, offset: offsetNum });
  });

  // POST /alertas — solo ADMIN/CDGRD
  app.post(
    '/alertas',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_GESTION.includes(user.rol)) {
        throw new ForbiddenError('Solo ADMIN y CDGRD pueden crear alertas');
      }

      const {
        tipo,
        nivel,
        titulo,
        descripcion,
        instrucciones_ciudadano,
        municipios_afectados,
      } = request.body as {
        tipo: string;
        nivel: string;
        titulo: string;
        descripcion?: string;
        instrucciones_ciudadano?: string;
        municipios_afectados?: string[];
      };

      const NIVELES_VALIDOS = ['VERDE', 'AMARILLO', 'NARANJA', 'ROJO'];
      if (!titulo?.trim()) throw new ValidationError('titulo es requerido');
      if (!tipo?.trim())   throw new ValidationError('tipo es requerido');
      if (!NIVELES_VALIDOS.includes(nivel)) throw new ValidationError('nivel debe ser VERDE, AMARILLO, NARANJA o ROJO');

      const munis = municipios_afectados ?? [];

      const [row] = await db`
        INSERT INTO alertas (
          tipo, nivel, titulo, descripcion, instrucciones_ciudadano,
          municipios_afectados, created_by, activa
        )
        VALUES (
          ${tipo}, ${nivel}, ${titulo}, ${descripcion ?? null}, ${instrucciones_ciudadano ?? ''},
          ${db.array(munis)}::uuid[], ${user.id}, false
        )
        RETURNING *
      `;

      return reply.status(201).send(row);
    },
  );

  // POST /alertas/:id/emitir
  app.post(
    '/alertas/:id/emitir',
    { config: { rateLimit: { max: 10, timeWindow: '1 hour' } }, preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_GESTION.includes(user.rol)) {
        throw new ForbiddenError('Solo ADMIN y CDGRD pueden emitir alertas');
      }

      const { id } = request.params as { id: string };

      const [alerta] = await db`SELECT * FROM alertas WHERE id = ${id}`;
      if (!alerta) throw new NotFoundError('Alerta');

      await db`
        UPDATE alertas
        SET activa = true, emitida_at = NOW()
        WHERE id = ${id}
      `;

      // Push best-effort: no revertir si falla
      enviarAlertaPush(
        alerta.id,
        alerta.nivel,
        alerta.titulo,
        alerta.municipios_afectados ?? [],
      ).catch((err: unknown) => {
        app.log.error({ err, alertaId: alerta.id }, 'enviarAlertaPush falló (alerta ya emitida)');
      });

      return reply.send({ ok: true, mensaje: 'Alerta emitida y notificaciones enviadas' });
    },
  );
}
