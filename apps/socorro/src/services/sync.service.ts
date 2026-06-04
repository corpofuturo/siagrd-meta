import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { database } from '../database';
import { Incidente, Actualizacion, ArchivoPendiente, AlertaCache } from '../database';
import { getAuthToken } from './auth.service';
import { API_BASE } from '../constants';

const DEVICE_ID_KEY = 'siagrd_device_id';

/**
 * Obtiene o genera un ID de dispositivo único persistido en SecureStore.
 */
export async function getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Sube archivos (fotos) pendientes al servidor mediante POST multipart.
 */
async function subirArchivos(token: string, deviceId: string): Promise<void> {
  const collection = database.get<ArchivoPendiente>('archivos_pendientes');
  const pendientes = await collection.query().fetch();
  const noSubidos = pendientes.filter((a) => !a.subido);

  for (const archivo of noSubidos) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(archivo.uriLocal);
      if (!fileInfo.exists) {
        await database.write(async () => {
          await archivo.update((a) => {
            a.error = 'Archivo no encontrado en disco';
          });
        });
        continue;
      }

      const response = await FileSystem.uploadAsync(
        `${API_BASE}/archivos/upload`,
        archivo.uriLocal,
        {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'archivo',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-Device-Id': deviceId,
            'X-Incidente-Id': archivo.incidenteId,
          },
        },
      );

      if (response.status >= 200 && response.status < 300) {
        await database.write(async () => {
          await archivo.update((a) => {
            a.subido = true;
            a.error = null;
          });
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (err) {
      await database.write(async () => {
        await archivo.update((a) => {
          a.error = err instanceof Error ? err.message : 'Error desconocido';
        });
      });
    }
  }
}

/**
 * Sube incidentes no sincronizados al servidor.
 */
async function subirIncidentes(token: string, deviceId: string): Promise<void> {
  const collection = database.get<Incidente>('incidentes');
  const pendientes = await collection.query().fetch();
  const noSynced = pendientes.filter((i) => !i.synced);

  if (noSynced.length === 0) return;

  const eventos = noSynced.map((i) => ({
    type: 'INSERT' as const,
    table: 'incidentes',
    record: {
      local_id: i.id,
      codigo: i.codigo,
      titulo: i.titulo,
      descripcion: i.descripcion,
      tipo_amenaza: i.tipoAmenaza,
      estado: i.estado,
      nivel_alerta: i.nivelAlerta,
      lat: i.lat,
      lng: i.lng,
      altitud: i.altitud,
      precision_gps: i.precisionGps,
      municipio_id: i.municipioId,
      afectados_estimado: i.afectadosEstimado,
      created_at_local: i.createdAtLocal,
    },
  }));

  const res = await fetch(`${API_BASE}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Device-Id': deviceId,
    },
    body: JSON.stringify({ eventos }),
  });

  if (!res.ok) return;

  const data: { resultados: Array<{ local_id: string; server_id: string }> } = await res.json();

  await database.write(async () => {
    for (const resultado of data.resultados) {
      const incidente = noSynced.find((i) => i.id === resultado.local_id);
      if (incidente) {
        await incidente.update((i) => {
          i.synced = true;
          i.serverId = resultado.server_id;
          i.syncError = null;
        });
      }
    }
  });
}

/**
 * Sube actualizaciones no sincronizadas al servidor.
 */
async function subirActualizaciones(token: string, deviceId: string): Promise<void> {
  const collection = database.get<Actualizacion>('actualizaciones');
  const pendientes = await collection.query().fetch();
  const noSynced = pendientes.filter((a) => !a.synced);

  if (noSynced.length === 0) return;

  const eventos = noSynced.map((a) => ({
    type: 'INSERT' as const,
    table: 'actualizaciones',
    record: {
      local_id: a.id,
      incidente_id: a.incidenteId,
      texto: a.texto,
      lat: a.lat,
      lng: a.lng,
      created_at_local: a.createdAtLocal,
    },
  }));

  const res = await fetch(`${API_BASE}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Device-Id': deviceId,
    },
    body: JSON.stringify({ eventos }),
  });

  if (!res.ok) return;

  await database.write(async () => {
    for (const actualizacion of noSynced) {
      await actualizacion.update((a) => {
        a.synced = true;
      });
    }
  });
}

/**
 * Descarga alertas activas del servidor y actualiza el cache local.
 */
async function descargarCambios(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/alertas`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return;

  const alertas: Array<{
    id: string;
    tipo: string;
    nivel: string;
    titulo: string;
    instrucciones_ciudadano: string;
    instrucciones_socorro?: string;
    activa: boolean;
  }> = await res.json();

  const collection = database.get<AlertaCache>('alertas_cache');

  await database.write(async () => {
    for (const alerta of alertas) {
      const existentes = await collection.query().fetch();
      const existente = existentes.find((a) => a.serverId === alerta.id);
      const ahora = Date.now();

      if (existente) {
        await existente.update((a) => {
          a.tipo = alerta.tipo;
          a.nivel = alerta.nivel;
          a.titulo = alerta.titulo;
          a.instruccionesCiudadano = alerta.instrucciones_ciudadano;
          a.instruccionesSocorro = alerta.instrucciones_socorro ?? null;
          a.activa = alerta.activa;
        });
      } else {
        await collection.create((a) => {
          a.serverId = alerta.id;
          a.tipo = alerta.tipo;
          a.nivel = alerta.nivel;
          a.titulo = alerta.titulo;
          a.instruccionesCiudadano = alerta.instrucciones_ciudadano;
          a.instruccionesSocorro = alerta.instrucciones_socorro ?? null;
          a.activa = alerta.activa;
        });
      }
    }
  });
}

/**
 * Retorna el número total de elementos pendientes de sincronizar.
 */
export async function getSyncPendingCount(): Promise<number> {
  const incidentes = await database.get<Incidente>('incidentes').query().fetch();
  const actualizaciones = await database.get<Actualizacion>('actualizaciones').query().fetch();
  const archivos = await database.get<ArchivoPendiente>('archivos_pendientes').query().fetch();

  const incidentesPendientes = incidentes.filter((i) => !i.synced).length;
  const actualizacionesPendientes = actualizaciones.filter((a) => !a.synced).length;
  const archivosPendientes = archivos.filter((a) => !a.subido).length;

  return incidentesPendientes + actualizacionesPendientes + archivosPendientes;
}

/**
 * Punto de entrada principal de sincronización.
 * Verifica conectividad antes de intentar cualquier operación de red.
 * Gatillos: inicio de app, reconexión de red, acción manual del usuario.
 */
export async function sincronizar(): Promise<void> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  const token = await getAuthToken();
  if (!token) return;

  const deviceId = await getDeviceId();

  await subirArchivos(token, deviceId);
  await subirIncidentes(token, deviceId);
  await subirActualizaciones(token, deviceId);
  await descargarCambios(token);
}
