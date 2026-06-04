import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { obtenerUbicacionSinBloquear, Coordenada } from './location.service';

export interface ResultadoFoto {
  uri_local: string;
  miniatura_uri: string;
  tamano_bytes: number;
  coordenada: Coordenada | null;
}

const FOTO_DIR = (FileSystem.documentDirectory ?? '') + 'fotos/';

/**
 * Asegura que el directorio de fotos existe.
 */
async function asegurarDirectorio(): Promise<void> {
  const info = await FileSystem.getInfoAsync(FOTO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(FOTO_DIR, { intermediates: true });
  }
}

/**
 * Genera un nombre de archivo único basado en el timestamp actual.
 */
function nombreArchivo(sufijo: string): string {
  return `incidente_${Date.now()}${sufijo}.jpg`;
}

/**
 * Procesa una foto tomada con la cámara:
 * - Redimensiona a máximo 1200px ancho, calidad 0.75 JPEG
 * - Genera miniatura 400x400, calidad 0.6
 * - Guarda en documentDirectory/fotos/
 * - Captura coordenadas GPS sin bloquear el flujo
 */
export async function procesarFoto(uriOriginal: string): Promise<ResultadoFoto> {
  await asegurarDirectorio();

  const timestamp = Date.now();

  // Imagen principal: max 1200px, calidad 0.75
  const imagenPrincipal = await ImageManipulator.manipulateAsync(
    uriOriginal,
    [{ resize: { width: 1200 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
  );

  // Miniatura: 400x400 crop centrado, calidad 0.6
  const miniatura = await ImageManipulator.manipulateAsync(
    uriOriginal,
    [{ resize: { width: 400, height: 400 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG },
  );

  // Guardar imagen principal en documentDirectory/fotos/
  const uriDestino = FOTO_DIR + nombreArchivo('_full');
  await FileSystem.moveAsync({ from: imagenPrincipal.uri, to: uriDestino });

  // Guardar miniatura
  const uriMiniatura = FOTO_DIR + `incidente_${timestamp}_thumb.jpg`;
  await FileSystem.moveAsync({ from: miniatura.uri, to: uriMiniatura });

  // Obtener tamaño del archivo principal
  const infoArchivo = await FileSystem.getInfoAsync(uriDestino, { size: true });
  const tamanoBbytes = (infoArchivo as FileSystem.FileInfo & { size?: number }).size ?? 0;

  // GPS no bloquea el flujo: si falla, coordenada = null
  const coordenada = await obtenerUbicacionSinBloquear();

  return {
    uri_local: uriDestino,
    miniatura_uri: uriMiniatura,
    tamano_bytes: tamanoBbytes,
    coordenada,
  };
}
