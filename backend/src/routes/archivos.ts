import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { uploadFoto } from '../services/storage.service.js';
import { ValidationError } from '../utils/errors.js';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/app/uploads';

export async function archivosRoutes(app: FastifyInstance): Promise<void> {
  // GET /archivos/static/* — servir archivos subidos (requiere autenticación)
  app.get(
    '/archivos/static/*',
    { preHandler: authMiddleware },
    async (request, reply) => {
      const wildcard = (request.params as { '*': string })['*'];
      // Prevenir path traversal: resolver la ruta completa y verificar que esté dentro de UPLOADS_DIR
      const resolvedBase = path.resolve(UPLOADS_DIR);
      const resolvedPath = path.resolve(path.join(UPLOADS_DIR, wildcard));

      if (!resolvedPath.startsWith(resolvedBase + path.sep) && resolvedPath !== resolvedBase) {
        return reply.status(400).send({ error: 'Ruta de archivo inválida' });
      }

      try {
        const stream = await import('node:fs').then((m) => m.createReadStream(resolvedPath));
        return reply.send(stream);
      } catch {
        return reply.status(404).send({ error: 'Archivo no encontrado' });
      }
    },
  );

  // POST /archivos/upload — subir foto de incidente
  app.post(
    '/archivos/upload',
    { config: { rateLimit: { max: 50, timeWindow: '1 hour' } }, preHandler: authMiddleware },
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

      const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
      if (!ALLOWED_MIME.includes(data.mimetype)) {
        throw new ValidationError(`Tipo de archivo no permitido: ${data.mimetype}`);
      }

      const buffer = await data.toBuffer();
      const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
      if (buffer.length > MAX_BYTES) {
        throw new ValidationError('El archivo supera el límite de 10 MB');
      }

      const MAGIC: Record<string, number[][]> = {
        'image/jpeg': [[0xFF, 0xD8, 0xFF]],
        'image/png':  [[0x89, 0x50, 0x4E, 0x47]],
        'image/webp': [[0x52, 0x49, 0x46, 0x46]],
        'image/gif':  [[0x47, 0x49, 0x46, 0x38]],
        'application/pdf': [[0x25, 0x50, 0x44, 0x46]],
      };
      const magic = MAGIC[data.mimetype];
      if (magic && !magic.some(sig => sig.every((byte, i) => buffer[i] === byte))) {
        throw new ValidationError('El contenido del archivo no coincide con su tipo declarado');
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
