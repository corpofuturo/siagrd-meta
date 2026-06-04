import type { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_ADMIN: RolUsuario[] = ['CDGRD', 'ADMIN'];

export async function recursosRoutes(app: FastifyInstance): Promise<void> {
  // GET /recursos — publico, todos ven disponibilidad de recursos
  app.get('/recursos', async (request, reply) => {
    const { tipo, municipio, disponible } = request.query as {
      tipo?: string;
      municipio?: string;
      disponible?: string;
    };

    let query = supabaseAdmin
      .from('recursos')
      .select('id, nombre, tipo, disponible, cantidad, municipio_id, organismo_id, updated_at')
      .order('nombre', { ascending: true });

    if (tipo) query = query.eq('tipo', tipo);
    if (municipio) query = query.eq('municipio_id', municipio);
    if (disponible !== undefined) query = query.eq('disponible', disponible === 'true');

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return reply.send({ data: data ?? [], total: (data ?? []).length });
  });

  // PATCH /recursos/:id — solo miembros del organismo dueno o CDGRD/ADMIN
  app.patch(
    '/recursos/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      // Obtener el recurso para verificar duenio
      const { data: recurso, error: fetchError } = await supabaseAdmin
        .from('recursos')
        .select('id, organismo_id')
        .eq('id', id)
        .single();

      if (fetchError || !recurso) throw new NotFoundError('Recurso no encontrado');

      // Verificar autorizacion: CDGRD/ADMIN pueden todo; otros solo si son del organismo dueno
      const esSuOrganismo =
        user.organismo_id != null && user.organismo_id === recurso.organismo_id;
      const esAdmin = ROLES_ADMIN.includes(user.rol);

      if (!esAdmin && !esSuOrganismo) {
        throw new ForbiddenError('Sin permiso para modificar este recurso');
      }

      const body = request.body as Record<string, unknown>;
      body['updated_at'] = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('recursos')
        .update(body)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return reply.send({ data });
    },
  );
}
