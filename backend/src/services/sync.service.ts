import { supabaseAdmin } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';
import type {
  SyncPayload,
  SyncResponse,
  SyncEvento,
  Incidente,
  Alerta,
} from '../types/domain.js';

const TABLAS_PERMITIDAS = new Set([
  'incidentes',
  'actualizaciones_incidente',
  'reportes_ciudadanos',
  'damnificados',
]);

async function procesarInsert(
  evento: SyncEvento,
  fallidos: SyncResponse['fallidos'],
): Promise<boolean> {
  if (!evento.registro_id) {
    fallidos.push({ id: evento.id, error: 'INSERT requiere registro_id' });
    return false;
  }

  // Verificar duplicado por registro_id
  const { data: existente } = await supabaseAdmin
    .from(evento.tabla)
    .select('id')
    .eq('id', evento.registro_id)
    .maybeSingle();

  if (existente) {
    logger.info({ evento_id: evento.id, registro_id: evento.registro_id }, 'INSERT duplicado ignorado');
    return true;
  }

  const { error } = await supabaseAdmin
    .from(evento.tabla)
    .insert({ id: evento.registro_id, ...evento.payload });

  if (error) {
    fallidos.push({ id: evento.id, error: error.message });
    return false;
  }
  return true;
}

async function procesarUpdate(
  evento: SyncEvento,
  conflictos: SyncResponse['conflictos'],
  fallidos: SyncResponse['fallidos'],
): Promise<boolean> {
  if (!evento.registro_id) {
    fallidos.push({ id: evento.id, error: 'UPDATE requiere registro_id' });
    return false;
  }

  // Detectar conflicto: servidor más nuevo que cliente
  const { data: serverRecord } = await supabaseAdmin
    .from(evento.tabla)
    .select('updated_at')
    .eq('id', evento.registro_id)
    .maybeSingle();

  if (serverRecord?.updated_at) {
    const serverTs = new Date(serverRecord.updated_at).getTime();
    if (serverTs > evento.timestamp_local) {
      // Conflicto detectado — guardar en conflictos_sync, last-write-wins servidor
      await supabaseAdmin.from('conflictos_sync').insert({
        evento_id: evento.id,
        tabla: evento.tabla,
        registro_id: evento.registro_id,
        payload_cliente: evento.payload,
        timestamp_cliente: evento.timestamp_local,
        resolucion: 'SERVER_WINS',
      }).then(() => {});

      conflictos.push({
        id: evento.id,
        resolucion: 'SERVER_WINS — servidor más reciente que cliente',
      });
      return true;
    }
  }

  const { error } = await supabaseAdmin
    .from(evento.tabla)
    .update({ ...evento.payload, updated_at: new Date().toISOString() })
    .eq('id', evento.registro_id);

  if (error) {
    fallidos.push({ id: evento.id, error: error.message });
    return false;
  }
  return true;
}

/**
 * Procesa el payload de sincronización offline del dispositivo móvil.
 * Ordena eventos por timestamp_local ASC para mantener orden causal.
 * Implementa last-write-wins del servidor en caso de conflicto.
 */
export async function procesarSync(
  payload: SyncPayload,
  userId: string,
): Promise<SyncResponse> {
  const fallidos: SyncResponse['fallidos'] = [];
  const conflictos: SyncResponse['conflictos'] = [];
  let procesados = 0;

  // Ordenar por timestamp_local ASC
  const eventosOrdenados = [...payload.eventos].sort(
    (a, b) => a.timestamp_local - b.timestamp_local,
  );

  for (const evento of eventosOrdenados) {
    // Validar tabla permitida
    if (!TABLAS_PERMITIDAS.has(evento.tabla)) {
      fallidos.push({
        id: evento.id,
        error: `Tabla '${evento.tabla}' no permitida en sync`,
      });
      continue;
    }

    let ok = false;
    try {
      if (evento.operacion === 'INSERT') {
        ok = await procesarInsert(evento, fallidos);
      } else if (evento.operacion === 'UPDATE') {
        ok = await procesarUpdate(evento, conflictos, fallidos);
      } else if (evento.operacion === 'DELETE') {
        const { error } = await supabaseAdmin
          .from(evento.tabla)
          .delete()
          .eq('id', evento.registro_id!);
        ok = !error;
        if (error) fallidos.push({ id: evento.id, error: error.message });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      fallidos.push({ id: evento.id, error: msg });
    }

    if (ok) procesados++;

    // Registrar en sync_queue
    await supabaseAdmin.from('sync_queue').insert({
      device_id: payload.device_id,
      user_id: userId,
      evento_id: evento.id,
      tabla: evento.tabla,
      operacion: evento.operacion,
      procesado: ok,
      error: ok ? null : fallidos.find((f) => f.id === evento.id)?.error,
    }).then(() => {});
  }

  // Obtener incidentes nuevos desde last_sync_timestamp
  let incidentes_nuevos: Incidente[] = [];
  if (payload.last_sync_timestamp) {
    const since = new Date(payload.last_sync_timestamp).toISOString();
    const { data } = await supabaseAdmin
      .from('incidentes')
      .select('*')
      .gt('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(100);
    incidentes_nuevos = (data as Incidente[]) ?? [];
  }

  // Alertas activas
  const { data: alertasData } = await supabaseAdmin
    .from('alertas')
    .select('*')
    .eq('activa', true)
    .order('created_at', { ascending: false });
  const alertas_activas = (alertasData as Alerta[]) ?? [];

  logger.info(
    {
      device_id: payload.device_id,
      user_id: userId,
      procesados,
      fallidos: fallidos.length,
      conflictos: conflictos.length,
    },
    'Sync procesado',
  );

  return {
    procesados,
    fallidos,
    conflictos,
    server_timestamp: Date.now(),
    incidentes_nuevos,
    alertas_activas,
  };
}
