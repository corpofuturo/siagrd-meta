import type { FastifyInstance } from 'fastify';
import { supabaseAdmin } from '../lib/supabase.js';
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

      let query = supabaseAdmin
        .from('incidentes')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtrar por municipio si no es ADMIN/CDGRD
      if (!ROLES_ADMIN.includes(user.rol) && user.municipio_id) {
        query = query.eq('municipio_id', user.municipio_id);
      }
      if (estado) query = query.eq('estado', estado);
      if (tipo) query = query.eq('tipo_amenaza', tipo);

      const { data, error } = await query;
      if (error) throw new Error(error.message);

      return reply.send({ data: data ?? [], total: (data ?? []).length });
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

      const { data, error } = await supabaseAdmin.rpc('incidentes_cercanos', {
        p_lat: latNum,
        p_lng: lngNum,
        p_radio_km: radioNum,
      });

      if (error) throw new Error(error.message);

      return reply.send({ data: data ?? [], radio_km: radioNum });
    },
  );

  // GET /incidentes/:id — detalle
  app.get(
    '/incidentes/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      const { data, error } = await supabaseAdmin
        .from('incidentes')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) throw new NotFoundError('Incidente');

      // Verificar acceso por municipio
      if (!ROLES_ADMIN.includes(user.rol) && user.municipio_id && data.municipio_id !== user.municipio_id) {
        throw new ForbiddenError('No tiene acceso a este incidente');
      }

      return reply.send(data);
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

      const body = request.body as Record<string, unknown>;
      const { data, error } = await supabaseAdmin
        .from('incidentes')
        .insert({ ...body, reportado_por: user.id })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return reply.status(201).send(data);
    },
  );

  // PATCH /incidentes/:id — actualizar
  app.patch(
    '/incidentes/:id',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = request.user!;

      // Obtener incidente actual para verificar permisos
      const { data: incidente, error: fetchError } = await supabaseAdmin
        .from('incidentes')
        .select('municipio_id, reportado_por')
        .eq('id', id)
        .single();

      if (fetchError || !incidente) throw new NotFoundError('Incidente');

      // ADMIN puede todo; roles de escritura solo en su municipio
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

      const body = request.body as Record<string, unknown>;
      const { data, error } = await supabaseAdmin
        .from('incidentes')
        .update({ ...body, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return reply.send(data);
    },
  );
}
