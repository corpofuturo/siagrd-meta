import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { uploadFoto } from '../services/storage.service.js';
import { ValidationError } from '../utils/errors.js';

export async function archivosRoutes(app: FastifyInstance): Promise<void> {
  // POST /archivos/upload — subir foto de incidente
  app.post(
    '/archivos/upload',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const user = request.user!;

      const data = await request.file();
      if (!data) throw new ValidationError('Se requiere un archivo adjunto');

      const { incidente_id, lat, lng } = request.query as {
        incidente_id?: string;
        lat?: string;
        lng?: string;
      };

      if (!incidente_id) throw new ValidationError('incidente_id es requerido');

      const buffer = await data.toBuffer();
      const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
      if (buffer.length > MAX_BYTES) {
        throw new ValidationError('El archivo supera el límite de 10 MB');
      }

      const coordenadas =
        lat && lng
          ? { lat: parseFloat(lat), lng: parseFloat(lng) }
          : undefined;

      const resultado = await uploadFoto(buffer, incidente_id, user.id, coordenadas);

      return reply.status(201).send(resultado);
    },
  );
}
