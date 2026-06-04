import type { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
import { authMiddleware } from '../middleware/auth.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';
import type { RolUsuario } from '../types/domain.js';

const ROLES_PERMITIDOS: RolUsuario[] = ['CDGRD', 'CMGRD', 'SOCORRO', 'ADMIN'];
const ROLES_ADMIN: RolUsuario[] = ['CDGRD', 'ADMIN'];

export async function damnificadosRoutes(app: FastifyInstance): Promise<void> {
  // GET /damnificados — solo CDGRD/CMGRD/SOCORRO, filtrado por municipio si CMGRD/SOCORRO
  app.get(
    '/damnificados',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;

      if (!ROLES_PERMITIDOS.includes(user.rol)) {
        throw new ForbiddenError('Sin acceso al registro de damnificados');
      }

      const { municipio, limit } = request.query as {
        municipio?: string;
        limit?: string;
      };

      let query = supabaseAdmin
        .from('damnificados')
        .select('*')
        .order('created_at', { ascending: false });

      // CMGRD y SOCORRO solo ven su municipio
      if (!ROLES_ADMIN.includes(user.rol) && user.municipio_id) {
        query = query.eq('municipio_id', user.municipio_id);
      } else if (municipio) {
        query = query.eq('municipio_id', municipio);
      }

      const limitNum = limit ? parseInt(limit, 10) : 100;
      query = query.limit(limitNum);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return reply.send({ data: data ?? [], total: (data ?? []).length });
    },
  );

  // GET /damnificados/:id — solo CDGRD/CMGRD/SOCORRO
  app.get(
    '/damnificados/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      if (!ROLES_PERMITIDOS.includes(user.rol)) {
        throw new ForbiddenError('Sin acceso al registro de damnificados');
      }

      let query = supabaseAdmin
        .from('damnificados')
        .select('*')
        .eq('id', id);

      // CMGRD y SOCORRO solo ven su municipio
      if (!ROLES_ADMIN.includes(user.rol) && user.municipio_id) {
        query = query.eq('municipio_id', user.municipio_id);
      }

      const { data, error } = await query.single();
      if (error || !data) throw new NotFoundError('Damnificado no encontrado');

      return reply.send({ data });
    },
  );

  // POST /damnificados — CDGRD/CMGRD/SOCORRO
  app.post(
    '/damnificados',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;

      if (!ROLES_PERMITIDOS.includes(user.rol)) {
        throw new ForbiddenError('Sin permiso para registrar damnificados');
      }

      const body = request.body as Record<string, unknown>;

      // CMGRD y SOCORRO solo pueden registrar en su municipio
      if (!ROLES_ADMIN.includes(user.rol) && user.municipio_id) {
        body['municipio_id'] = user.municipio_id;
      }

      body['registrado_por'] = user.id;
      body['created_at'] = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('damnificados')
        .insert(body)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return reply.status(201).send({ data });
    },
  );

  // PATCH /damnificados/:id — CDGRD/CMGRD/SOCORRO
  app.patch(
    '/damnificados/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };

      if (!ROLES_PERMITIDOS.includes(user.rol)) {
        throw new ForbiddenError('Sin permiso para actualizar damnificados');
      }

      // Verificar que el registro existe y el usuario tiene acceso a ese municipio
      let checkQuery = supabaseAdmin
        .from('damnificados')
        .select('id, municipio_id')
        .eq('id', id);

      if (!ROLES_ADMIN.includes(user.rol) && user.municipio_id) {
        checkQuery = checkQuery.eq('municipio_id', user.municipio_id);
      }

      const { data: existing, error: checkError } = await checkQuery.single();
      if (checkError || !existing) throw new NotFoundError('Damnificado no encontrado');

      const body = request.body as Record<string, unknown>;
      body['updated_at'] = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from('damnificados')
        .update(body)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return reply.send({ data });
    },
  );
}
