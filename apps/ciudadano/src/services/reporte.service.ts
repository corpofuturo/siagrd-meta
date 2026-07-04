import * as ImageManipulator from 'expo-image-manipulator';
import { getToken } from './auth.service';
import type { Coordenada } from './location.service';

import { API_BASE } from '../constants';
const BACKEND = API_BASE;
const FOTO_MAX_PX = 800;
const FOTO_CALIDAD = 0.7;

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
 * Comprime y sube foto al backend. Retorna la URL pública o null si falla.
 */
async function subirFoto(uri: string): Promise<string | null> {
  try {
    const compressed = await comprimirFoto(uri);

    const filename = `reporte_${Date.now()}.jpg`;
    const formData = new FormData();
    formData.append('file', {
      uri: compressed,
      name: filename,
      type: 'image/jpeg',
    } as unknown as Blob);

    const token = await getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${BACKEND}/archivos`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) return null;
    const json = await res.json();
    return (json.url as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * Envía un reporte de emergencia ciudadano al backend.
 * Si el usuario no está autenticado, se envía como anónimo (sin Authorization).
 * La foto es opcional.
 */
export async function enviarReporte(
  tipo: string,
  coordenada: Coordenada,
  descripcion?: string,
  fotoUri?: string
): Promise<{ id: string }> {
  let foto_url: string | null = null;
  if (fotoUri) {
    foto_url = await subirFoto(fotoUri);
  }

  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BACKEND}/reportes-ciudadanos`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tipo_amenaza: tipo,
      latitud: coordenada.latitud,
      longitud: coordenada.longitud,
      descripcion: descripcion ?? undefined,
      foto_url: foto_url ?? undefined,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error enviando reporte: ${res.status} ${text}`);
  }

  const data = await res.json();
  return { id: data.id };
}
