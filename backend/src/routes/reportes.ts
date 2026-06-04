import type { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_LECTURA: RolUsuario[] = ['CDGRD', 'CMGRD', 'SOCORRO', 'ADMIN'];

export async function reportesRoutes(app: FastifyInstance): Promise<void> {
  // GET /reportes-ciudadanos — solo CDGRD/CMGRD/SOCORRO
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

      let query = supabaseAdmin
        .from('reportes_ciudadanos')
        .select('*')
        .order('created_at', { ascending: false });

      if (estado) query = query.eq('estado', estado);
      if (municipio) query = query.eq('municipio_id', municipio);

      const limitNum = limit ? parseInt(limit, 10) : 50;
      query = query.limit(limitNum);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return reply.send({ data: data ?? [], total: (data ?? []).length });
    },
  );

  // POST /reportes-ciudadanos — cualquiera, incluidos no autenticados (anonimo=true)
  app.post('/reportes-ciudadanos', async (request, reply) => {
    const body = request.body as Record<string, unknown>;

    const payload: Record<string, unknown> = {
      descripcion: body.descripcion,
      tipo: body.tipo,
      municipio_id: body.municipio_id,
      ubicacion: body.ubicacion ?? null,
      created_at: new Date().toISOString(),
    };

    if (body.anonimo === true) {
      payload['anonimo'] = true;
      payload['reportante_id'] = null;
    } else {
      // Intentar identificar al usuario si viene token
      const header = request.headers.authorization;
      if (header?.startsWith('Bearer ')) {
        const token = header.slice(7);
        try {
          await authMiddleware(request, reply);
          payload['reportante_id'] = request.user?.id ?? null;
          payload['anonimo'] = false;
        } catch {
          payload['reportante_id'] = null;
          payload['anonimo'] = true;
        }
      } else {
        payload['reportante_id'] = null;
        payload['anonimo'] = true;
      }
    }

    payload['estado'] = 'PENDIENTE';

    const { data, error } = await supabaseAdmin
      .from('reportes_ciudadanos')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return reply.status(201).send({ data });
  });
}
