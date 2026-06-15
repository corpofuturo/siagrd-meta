import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import { db } from '../lib/db.js';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/app/uploads';
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? '';
const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

export interface FotoUploadResult {
  url: string;
  miniatura_url: string;
  tamano_bytes: number;
}

/**
 * Sube una foto optimizada para redes 2G.
 * Valida MIME real (no extensión), comprime con sharp y genera miniatura.
 * Guarda en sistema de archivos local (/app/uploads en el contenedor).
 */
export async function uploadFoto(
  buffer: Buffer,
  incidente_id: string,
  usuario_id: string,
  coordenadas?: { lat: number; lng: number },
): Promise<FotoUploadResult> {
  // Validar MIME real
  const fileInfo = await fileTypeFromBuffer(buffer);
  if (!fileInfo || !MIME_PERMITIDOS.has(fileInfo.mime)) {
    throw new ValidationError(
      `Tipo de archivo no permitido: ${fileInfo?.mime ?? 'desconocido'}. Se aceptan JPEG, PNG, WebP y HEIC.`,
    );
  }

  const tamano_original = buffer.length;
  const ts = Date.now();

  // Comprimir imagen principal: max 1200px lado mayor, calidad 75, JPEG
  const comprimida = await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 75, progressive: true })
    .toBuffer();

  // Generar miniatura: 300x300, calidad 60, JPEG
  const miniatura = await sharp(buffer)
    .resize(300, 300, { fit: 'cover' })
    .jpeg({ quality: 60 })
    .toBuffer();

  logger.info(
    {
      incidente_id,
      tamano_original,
      tamano_comprimido: comprimida.length,
      reduccion_pct: Math.round((1 - comprimida.length / tamano_original) * 100),
    },
    'Foto comprimida',
  );

  // Crear directorio si no existe
  const dirIncidente = path.join(UPLOADS_DIR, 'incidentes', incidente_id);
  await fs.mkdir(dirIncidente, { recursive: true });

  const nombrePrincipal = `${ts}.jpg`;
  const nombreMiniatura = `${ts}_thumb.jpg`;
  const pathPrincipal = path.join(dirIncidente, nombrePrincipal);
  const pathMiniatura = path.join(dirIncidente, nombreMiniatura);

  await fs.writeFile(pathPrincipal, comprimida);
  await fs.writeFile(pathMiniatura, miniatura);

  // URLs públicas relativas al endpoint estático
  const urlBase = `${PUBLIC_BASE_URL}/api/v1/archivos/static`;
  const url = `${urlBase}/incidentes/${incidente_id}/${nombrePrincipal}`;
  const miniatura_url = `${urlBase}/incidentes/${incidente_id}/${nombreMiniatura}`;

  // Registrar en tabla archivos
  await db`
    INSERT INTO archivos (
      incidente_id, usuario_id, url, miniatura_url,
      tamano_bytes, tamano_original_bytes, mime_type,
      lat, lng, storage_path, created_at
    )
    VALUES (
      ${incidente_id}, ${usuario_id}, ${url}, ${miniatura_url},
      ${comprimida.length}, ${tamano_original}, 'image/jpeg',
      ${coordenadas?.lat ?? null}, ${coordenadas?.lng ?? null},
      ${`incidentes/${incidente_id}/${nombrePrincipal}`},
      NOW()
    )
  `;

  return { url, miniatura_url, tamano_bytes: comprimida.length };
}
