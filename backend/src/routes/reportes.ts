import type { FastifyInstance } from 'fastify';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_LECTURA: RolUsuario[] = ['CDGRD', 'CMGRD', 'SOCORRO', 'ADMIN', 'ALCALDIA', 'GOBERNACION'];
const ROLES_CORROBORAR: RolUsuario[] = ['CDGRD', 'CMGRD', 'ALCALDIA', 'GOBERNACION', 'SOCORRO'];

const ESTADOS_VALIDOS = ['PENDIENTE', 'REVISADO', 'CORROBORADO', 'VINCULADO', 'DESCARTADO'] as const;
type EstadoReporte = typeof ESTADOS_VALIDOS[number];

export async function reportesRoutes(app: FastifyInstance): Promise<void> {
  // GET /reportes-ciudadanos — solo roles autorizados
  app.get(
    '/reportes-ciudadanos',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;

      if (!ROLES_LECTURA.includes(user.rol)) {
        throw new ForbiddenError('Sin acceso a reportes ciudadanos');
      }

      const { estado, municipio, limit } = request.query as {
        estado?: string;
        municipio?: string;
        limit?: string;
      };

      // Validar que el estado sea uno de los permitidos si se provee
      if (estado && !ESTADOS_VALIDOS.includes(estado as EstadoReporte)) {
        throw new ValidationError(`estado inválido. Valores aceptados: ${ESTADOS_VALIDOS.join(', ')}`);
      }

      const limitNum = Math.min(limit ? parseInt(limit, 10) : 50, 500);

      // ALCALDIA y GOBERNACION solo ven reportes de su municipio
      const mid = (user.rol === 'ALCALDIA' || user.rol === 'GOBERNACION')
        ? user.municipio_id
        : municipio;

      const rows = await db`
        SELECT * FROM reportes_ciudadanos
        WHERE TRUE
          ${estado ? db`AND estado = ${estado}` : db``}
          ${mid ? db`AND municipio_id = ${mid}` : db``}
        ORDER BY created_at DESC
        LIMIT ${limitNum}
      `;

      return reply.send({ data: rows, total: rows.length });
    },
  );

  // POST /reportes-ciudadanos — público (incluye anónimos)
  // Rate limit diferenciado (Ley 1581):
  //   - Anónimos  → máx 3 reportes/hora por IP
  //   - Autenticados → máx 10 reportes/hora por token
  app.post(
    '/reportes-ciudadanos',
    {
      config: {
        rateLimit: {
          timeWindow: '1 hour',
          // max como función: 10 para autenticados, 3 para anónimos
          max: (request) =>
            request.headers.authorization?.startsWith('Bearer ') ? 10 : 3,
          // keyGenerator: clave distinta para anónimos (IP) y autenticados (token)
          keyGenerator: (request) => {
            const token = request.headers.authorization;
            if (token?.startsWith('Bearer ')) {
              try {
                // Decodificar payload (sin verificar firma — solo para clave de rate limit)
                const b64 = token.slice(7).split('.')[1] ?? '';
                const payload = JSON.parse(Buffer.from(b64, 'base64url').toString()) as { sub?: string };
                if (payload.sub) return `auth:${payload.sub}`;
              } catch { /* fallback */ }
              return `auth:${token.slice(7, 47)}`;
            }
            const ip =
              request.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ??
              request.ip ??
              'unknown';
            return `anon:${ip}`;
          },
          errorResponseBuilder: () => ({
            statusCode: 429,
            error: 'Too Many Requests',
            message: 'Límite de reportes excedido. Intente nuevamente en una hora.',
            code: 'RATE_LIMIT_EXCEEDED',
          }),
        },
      },
    },
    async (request, reply) => {
      const body = request.body as Record<string, unknown>;

      let reportante_id: string | null = null;
      let anonimo = true;

      if (body.anonimo === true) {
        anonimo = true;
        reportante_id = null;
      } else {
        const header = request.headers.authorization;
        if (header?.startsWith('Bearer ')) {
          try {
            await authMiddleware(request, reply);
            reportante_id = request.user?.id ?? null;
            anonimo = reportante_id === null;
          } catch {
            reportante_id = null;
            anonimo = true;
          }
        }
      }

      // Marcar si es anónimo para que audit.ts omita la IP (Ley 1581)
      (request as any).__reporte_anonimo = anonimo;

      const [row] = await db`
        INSERT INTO reportes_ciudadanos (
          descripcion, tipo, municipio_id, ubicacion, anonimo, reportante_id, estado,
          created_at, updated_at
        )
        VALUES (
          ${body.descripcion as string},
          ${body.tipo as string},
          ${body.municipio_id as string},
          ${body.ubicacion ? JSON.stringify(body.ubicacion) : null},
          ${anonimo},
          ${reportante_id},
          'PENDIENTE',
          NOW(), NOW()
        )
        RETURNING *
      `;

      return reply.status(201).send({ data: row });
    },
  );

  // PATCH /reportes-ciudadanos/:id — actualizar estado (máquina de estados)
  app.patch(
    '/reportes-ciudadanos/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_CORROBORAR.includes(user.rol)) {
        throw new ForbiddenError('Sin permiso para actualizar reportes ciudadanos');
      }

      const { id } = request.params as { id: string };
      const body = request.body as Record<string, unknown>;

      const [reporte] = await db`SELECT id, estado, municipio_id FROM reportes_ciudadanos WHERE id = ${id}`;
      if (!reporte) throw new NotFoundError('Reporte no encontrado');

      // ALCALDIA y GOBERNACION solo pueden actuar sobre reportes de su municipio
      if ((user.rol === 'ALCALDIA' || user.rol === 'GOBERNACION') && user.municipio_id !== reporte.municipio_id) {
        throw new ForbiddenError('Sin acceso a reportes de otro municipio');
      }

      const allowed = ['estado', 'observaciones'];
      const updates: Record<string, unknown> = {};
      for (const k of allowed) {
        if (body[k] !== undefined) updates[k] = body[k];
      }
      if (Object.keys(updates).length === 0) throw new ValidationError('Sin campos para actualizar');

      if (updates.estado) {
        if (!ESTADOS_VALIDOS.includes(updates.estado as EstadoReporte)) {
          throw new ValidationError(`estado inválido. Valores aceptados: ${ESTADOS_VALIDOS.join(', ')}`);
        }
      }

      updates.updated_at = new Date();

      const sets = Object.entries(updates).map(([k, v]) => db`${db(k)} = ${v as any}`);
      const [updated] = await db`
        UPDATE reportes_ciudadanos
        SET ${sets.reduce((a, b) => db`${a}, ${b}`)}
        WHERE id = ${id}
        RETURNING *
      `;

      return reply.send(updated);
    },
  );

  // POST /reportes-ciudadanos/:id/corroborar — registrar corroboración
  app.post(
    '/reportes-ciudadanos/:id/corroborar',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_CORROBORAR.includes(user.rol)) {
        throw new ForbiddenError('Sin permiso para corroborar reportes');
      }

      const { id } = request.params as { id: string };
      const body = request.body as { observaciones?: string; confirmado: boolean };

      if (body.confirmado === undefined) throw new ValidationError('confirmado es requerido (boolean)');

      const [reporte] = await db`SELECT id, estado, municipio_id FROM reportes_ciudadanos WHERE id = ${id}`;
      if (!reporte) throw new NotFoundError('Reporte no encontrado');

      // ALCALDIA y GOBERNACION solo corroboran reportes de su municipio
      if ((user.rol === 'ALCALDIA' || user.rol === 'GOBERNACION') && user.municipio_id !== reporte.municipio_id) {
        throw new ForbiddenError('Sin acceso a reportes de otro municipio');
      }

      // Derivar tipo_grupo y grupo_id del perfil del usuario corroborador
      const [perfil] = await db`
        SELECT alcaldia_id, gobernacion_id, organismo_id, comite_id
        FROM profiles WHERE id = ${user.id}
      `;
      let tipo_grupo: string;
      let grupo_id: string | null = null;
      if (user.rol === 'ALCALDIA' && perfil?.alcaldia_id) {
        tipo_grupo = 'ALCALDIA'; grupo_id = perfil.alcaldia_id;
      } else if (user.rol === 'GOBERNACION' && perfil?.gobernacion_id) {
        tipo_grupo = 'GOBERNACION'; grupo_id = perfil.gobernacion_id;
      } else if ((user.rol === 'CDGRD' || user.rol === 'CMGRD') && perfil?.comite_id) {
        tipo_grupo = 'COMITE'; grupo_id = perfil.comite_id;
      } else if (user.rol === 'SOCORRO' && perfil?.organismo_id) {
        tipo_grupo = 'ORGANISMO'; grupo_id = perfil.organismo_id;
      } else {
        tipo_grupo = user.rol as string; grupo_id = user.id;
      }

      // Registrar corroboración
      const [corroboracion] = await db`
        INSERT INTO corroboraciones_reporte (
          reporte_id, corroborado_por, tipo_grupo, grupo_id, confirmado, notas, created_at
        )
        VALUES (
          ${id},
          ${user.id},
          ${tipo_grupo},
          ${grupo_id},
          ${body.confirmado},
          ${body.observaciones ?? null},
          NOW()
        )
        RETURNING *
      `;

      // Si confirmado, actualizar estado del reporte a CORROBORADO
      if (body.confirmado) {
        await db`
          UPDATE reportes_ciudadanos
          SET estado = 'CORROBORADO', updated_at = NOW()
          WHERE id = ${id} AND estado IN ('PENDIENTE', 'REVISADO')
        `;
      }

      return reply.status(201).send(corroboracion);
    },
  );

  // GET /reportes-ciudadanos/:id/corroboraciones — listar corroboraciones
  app.get(
    '/reportes-ciudadanos/:id/corroboraciones',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_LECTURA.includes(user.rol)) {
        throw new ForbiddenError('Sin acceso');
      }

      const { id } = request.params as { id: string };
      const [reporte] = await db`SELECT id, municipio_id FROM reportes_ciudadanos WHERE id = ${id}`;
      if (!reporte) throw new NotFoundError('Reporte no encontrado');

      if ((user.rol === 'ALCALDIA' || user.rol === 'GOBERNACION') && user.municipio_id !== reporte.municipio_id) {
        throw new ForbiddenError('Sin acceso a reportes de otro municipio');
      }

      const rows = await db`
        SELECT c.*, p.nombre, p.apellido, p.email
        FROM corroboraciones_reporte c
        LEFT JOIN profiles p ON p.id = c.corroborado_por
        WHERE c.reporte_id = ${id}
        ORDER BY c.created_at DESC
      `;

      return reply.send({ data: rows, total: rows.length });
    },
  );
}
