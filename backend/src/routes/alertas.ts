import type { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import { enviarAlertaPush } from '../services/notifications.service.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_GESTION: RolUsuario[] = ['ADMIN', 'CDGRD'];

export async function alertasRoutes(app: FastifyInstance): Promise<void> {
  // GET /alertas — público, solo activas
  app.get('/alertas', async (_request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('alertas')
      .select('*')
      .eq('activa', true)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    return reply.send({ data: data ?? [], total: (data ?? []).length });
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

      const body = request.body as Record<string, unknown>;
      const { data, error } = await supabaseAdmin
        .from('alertas')
        .insert({ ...body, creado_por: user.id })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return reply.status(201).send(data);
    },
  );

  // POST /alertas/:id/emitir — emitir push notifications
  app.post(
    '/alertas/:id/emitir',
    { config: { rateLimit: { max: 10, timeWindow: '1 hour' } }, preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      if (!ROLES_GESTION.includes(user.rol)) {
        throw new ForbiddenError('Solo ADMIN y CDGRD pueden emitir alertas');
      }

      const { id } = request.params as { id: string };

      const { data: alerta, error } = await supabaseAdmin
        .from('alertas')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !alerta) throw new NotFoundError('Alerta');

      await enviarAlertaPush(
        alerta.id,
        alerta.nivel,
        alerta.titulo,
        alerta.municipios_afectados ?? [],
      );

      // Marcar como activa si no lo estaba
      await supabaseAdmin
        .from('alertas')
        .update({ activa: true, emitida_at: new Date().toISOString() })
        .eq('id', id);

      return reply.send({ ok: true, mensaje: 'Alerta emitida y notificaciones enviadas' });
    },
  );
}
