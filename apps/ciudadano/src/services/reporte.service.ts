import * as ImageManipulator from 'expo-image-manipulator';
import { supabase, type Database } from '../lib/supabase';
import type { Coordenada } from './location.service';

type ReporteInsert =
  Database['public']['Tables']['reportes_ciudadanos']['Insert'];

const FOTO_MAX_PX = 800;
const FOTO_CALIDAD = 0.7;
const STORAGE_BUCKET = 'reportes-fotos';

/**
 * Comprime una imagen a max 800px y calidad 0.7 para ahorrar ancho de banda.
 */
async function comprimirFoto(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: FOTO_MAX_PX } }],
    { compress: FOTO_CALIDAD, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

/**
 * Sube foto a Supabase Storage y retorna URL pública.
 */
async function subirFoto(uri: string): Promise<string> {
  const compressed = await comprimirFoto(uri);

  const filename = `reporte_${Date.now()}.jpg`;
  const formData = new FormData();
  formData.append('file', {
    uri: compressed,
    name: filename,
    type: 'image/jpeg',
  } as unknown as Blob);

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, formData, { contentType: 'image/jpeg' });

  if (error) throw new Error(`Error subiendo foto: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);

  return publicUrl;
}

/**
 * Envía un reporte de emergencia ciudadano a Supabase.
 * Si el usuario no está autenticado, se guarda como anónimo.
 * La foto es opcional y se sube después del registro principal.
 */
export async function enviarReporte(
  tipo: string,
  coordenada: Coordenada,
  descripcion?: string,
  fotoUri?: string
): Promise<{ id: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const anonimo = !user;

  let fotoUrl: string | null = null;
  if (fotoUri) {
    try {
      fotoUrl = await subirFoto(fotoUri);
    } catch {
      // Foto opcional — continuar sin ella si falla la subida
      fotoUrl = null;
    }
  }

  const reporte: ReporteInsert = {
    tipo_amenaza: tipo,
    latitud: coordenada.latitud,
    longitud: coordenada.longitud,
    descripcion: descripcion ?? null,
    foto_url: fotoUrl,
    anonimo,
    user_id: user?.id ?? null,
    municipio_codigo: null, // resuelto por backend con coordenadas
  };

  const { data, error } = await supabase
    .from('reportes_ciudadanos')
    .insert(reporte)
    .select('id')
    .single();

  if (error) throw new Error(`Error enviando reporte: ${error.message}`);
  return { id: data.id };
}
