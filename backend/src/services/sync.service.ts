import { db } from '../lib/db.js';
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

  try {
    // Verificar duplicado por registro_id — idempotencia
    const tabla = evento.tabla as 'incidentes' | 'actualizaciones_incidente' | 'reportes_ciudadanos' | 'damnificados';
    const existente = await db`
      SELECT id FROM ${db(tabla)} WHERE id = ${evento.registro_id} LIMIT 1
    `;
    if (existente.length > 0) {
      logger.info({ evento_id: evento.id, registro_id: evento.registro_id }, 'INSERT duplicado ignorado');
      return true;
    }

    const payload = { id: evento.registro_id, ...evento.payload };
    const columns = Object.keys(payload);
    const values = Object.values(payload);

    await db`INSERT INTO ${db(tabla)} ${db(
      [Object.fromEntries(columns.map((c, i) => [c, values[i]]))],
    )}`;
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    fallidos.push({ id: evento.id, error: msg });
    return false;
  }
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

  try {
    const tabla = evento.tabla as 'incidentes' | 'actualizaciones_incidente' | 'reportes_ciudadanos' | 'damnificados';

    // Detectar conflicto: servidor más nuevo que cliente
    const serverRows = await db`
      SELECT updated_at FROM ${db(tabla)} WHERE id = ${evento.registro_id} LIMIT 1
    `;

    if (serverRows.length > 0 && serverRows[0].updated_at) {
      const serverTs = new Date(serverRows[0].updated_at as string).getTime();
      if (serverTs > evento.timestamp_local) {
        // Guardar conflicto y aplicar SERVER_WINS
        await db`
          INSERT INTO conflictos_sync
            (evento_id, tabla, registro_id, payload_cliente, timestamp_cliente, resolucion)
          VALUES
            (${evento.id}, ${evento.tabla}, ${evento.registro_id},
             ${JSON.stringify(evento.payload)}, ${evento.timestamp_local}, 'SERVER_WINS')
          ON CONFLICT DO NOTHING
        `;
        conflictos.push({
          id: evento.id,
          resolucion: 'SERVER_WINS — servidor más reciente que cliente',
        });
        return true;
      }
    }

    const updateData = { ...evento.payload, updated_at: new Date().toISOString() };
    await db`UPDATE ${db(tabla)} SET ${db(updateData)} WHERE id = ${evento.registro_id}`;
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    fallidos.push({ id: evento.id, error: msg });
    return false;
  }
}

async function procesarDelete(
  evento: SyncEvento,
  fallidos: SyncResponse['fallidos'],
): Promise<boolean> {
  if (!evento.registro_id) {
    fallidos.push({ id: evento.id, error: 'DELETE requiere registro_id' });
    return false;
  }
  try {
    const tabla = evento.tabla as 'incidentes' | 'actualizaciones_incidente' | 'reportes_ciudadanos' | 'damnificados';
    await db`DELETE FROM ${db(tabla)} WHERE id = ${evento.registro_id}`;
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    fallidos.push({ id: evento.id, error: msg });
    return false;
  }
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

  const eventosOrdenados = [...payload.eventos].sort(
    (a, b) => a.timestamp_local - b.timestamp_local,
  );

  for (const evento of eventosOrdenados) {
    if (!TABLAS_PERMITIDAS.has(evento.tabla)) {
      fallidos.push({ id: evento.id, error: `Tabla '${evento.tabla}' no permitida en sync` });
      continue;
    }

    let ok = false;
    try {
      if (evento.operacion === 'INSERT') {
        ok = await procesarInsert(evento, fallidos);
      } else if (evento.operacion === 'UPDATE') {
        ok = await procesarUpdate(evento, conflictos, fallidos);
      } else if (evento.operacion === 'DELETE') {
        ok = await procesarDelete(evento, fallidos);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      fallidos.push({ id: evento.id, error: msg });
    }

    if (ok) procesados++;

    // Registrar en sync_queue (sin bloquear)
    db`
      INSERT INTO sync_queue
        (device_id, user_id, evento_id, tabla, operacion, procesado, error)
      VALUES
        (${payload.device_id}, ${userId}, ${evento.id}, ${evento.tabla},
         ${evento.operacion}, ${ok}, ${ok ? null : (fallidos.find((f) => f.id === evento.id)?.error ?? null)})
      ON CONFLICT DO NOTHING
    `.catch((e: unknown) => {
      logger.warn({ err: e }, 'Error registrando en sync_queue');
    });
  }

  // Incidentes nuevos desde last_sync_timestamp
  let incidentes_nuevos: Incidente[] = [];
  if (payload.last_sync_timestamp) {
    const since = new Date(payload.last_sync_timestamp).toISOString();
    incidentes_nuevos = await db<Incidente[]>`
      SELECT * FROM incidentes
      WHERE updated_at > ${since}
      ORDER BY updated_at DESC
      LIMIT 100
    `;
  }

  // Alertas activas
  const alertas_activas = await db<Alerta[]>`
    SELECT * FROM alertas WHERE activa = true ORDER BY created_at DESC
  `;

  logger.info(
    { device_id: payload.device_id, user_id: userId, procesados, fallidos: fallidos.length, conflictos: conflictos.length },
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
