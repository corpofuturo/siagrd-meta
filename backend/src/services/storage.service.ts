import sharp from 'sharp';
import { fromBuffer as fileTypeFromBuffer } from 'file-type';
import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

const BUCKET = 'incidentes';
const MIME_PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

export interface FotoUploadResult {
  url: string;
  miniatura_url: string;
  tamano_bytes: number;
}

/**
 * Sube una foto optimizada para redes 2G.
 * Valida MIME real (no extensión), comprime con sharp y genera miniatura.
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

  // Paths en Supabase Storage
  const pathPrincipal = `incidentes/${incidente_id}/${ts}.jpg`;
  const pathMiniatura = `incidentes/${incidente_id}/${ts}_thumb.jpg`;

  // Subir imagen principal
  const { error: errPrincipal } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(pathPrincipal, comprimida, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (errPrincipal) throw new Error(`Error subiendo foto: ${errPrincipal.message}`);

  // Subir miniatura
  const { error: errMiniatura } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(pathMiniatura, miniatura, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (errMiniatura) throw new Error(`Error subiendo miniatura: ${errMiniatura.message}`);

  // Obtener URLs públicas
  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(pathPrincipal);
  const { data: urlMiniData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(pathMiniatura);

  // Registrar en tabla archivos
  await supabaseAdmin.from('archivos').insert({
    incidente_id,
    usuario_id,
    url: urlData.publicUrl,
    miniatura_url: urlMiniData.publicUrl,
    tamano_bytes: comprimida.length,
    tamano_original_bytes: tamano_original,
    mime_type: 'image/jpeg',
    lat: coordenadas?.lat ?? null,
    lng: coordenadas?.lng ?? null,
    storage_path: pathPrincipal,
  });

  return {
    url: urlData.publicUrl,
    miniatura_url: urlMiniData.publicUrl,
    tamano_bytes: comprimida.length,
  };
}
