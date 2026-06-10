/**
 * offline-queue.service.ts
 *
 * Encola reportes ciudadanos en AsyncStorage cuando no hay red.
 * Cuando el dispositivo recupera conexión, los reintenta automáticamente.
 *
 * Uso:
 *   await encolarReporte(payload);   // guarda localmente si offline
 *   await procesarCola();            // llama esto al detectar conexión
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'satam_reporte_queue';

export interface ReporteEnColado {
  id: string;            // UUID local para rastreo
  tipo_amenaza: string;
  latitud: number;
  longitud: number;
  descripcion?: string;
  foto_uri?: string;     // URI local de la foto
  timestamp: number;     // Date.now()
  intentos: number;
}

export async function obtenerCola(): Promise<ReporteEnColado[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as ReporteEnColado[]) : [];
  } catch {
    return [];
  }
}

export async function encolarReporte(
  payload: Omit<ReporteEnColado, 'id' | 'timestamp' | 'intentos'>
): Promise<string> {
  const id = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const item: ReporteEnColado = { ...payload, id, timestamp: Date.now(), intentos: 0 };
  const cola = await obtenerCola();
  cola.push(item);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(cola));
  return id;
}

export async function eliminarDeCola(id: string): Promise<void> {
  const cola = await obtenerCola();
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(cola.filter((r) => r.id !== id)));
}

export async function contarPendientes(): Promise<number> {
  const cola = await obtenerCola();
  return cola.length;
}
