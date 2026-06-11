import { db } from '../lib/db.js';
import { logger } from '../utils/logger.js';
import type { NivelAlerta } from '../types/domain.js';

// ---------------------------------------------------------------------------
// FCM init
// ---------------------------------------------------------------------------

let fcmApp: import('firebase-admin').app.App | null = null;

export function initFCM(): void {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    logger.warn({ service: 'fcm' }, 'FIREBASE_PROJECT_ID no configurado — notificaciones push deshabilitadas');
    return;
  }

  try {
    const admin = require('firebase-admin') as typeof import('firebase-admin');

    const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
      : admin.credential.applicationDefault();

    fcmApp = admin.initializeApp({ credential, projectId });

    logger.info({ service: 'fcm', projectId }, 'Firebase Admin inicializado');
  } catch (err) {
    logger.error({ err, service: 'fcm' }, 'Error inicializando Firebase Admin');
  }
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type CanalNotificacion = 'PUSH' | 'TELEGRAM' | 'WHATSAPP';

export interface NotificationPayload {
  alerta_id: string;
  canal: CanalNotificacion;
  nivel: NivelAlerta;
  titulo: string;
  municipios_ids: string[];
  destinatario_id?: string;
  destinatario_tipo?: string;
}

// ---------------------------------------------------------------------------
// Enqueue — idempotente
// ---------------------------------------------------------------------------

export async function enqueueNotification(
  payload: NotificationPayload,
  idempotencyKey: string,
): Promise<void> {
  const {
    alerta_id,
    canal,
    nivel,
    titulo,
    municipios_ids,
    destinatario_id = null,
    destinatario_tipo = 'BROADCAST',
  } = payload;

  await db`
    INSERT INTO notificaciones
      (alerta_id, canal, nivel, titulo, municipios_ids,
       destinatario_id, destinatario_tipo,
       estado, reintentos, idempotency_key)
    VALUES
      (${alerta_id}, ${canal}, ${nivel}, ${titulo}, ${db.array(municipios_ids)},
       ${destinatario_id}, ${destinatario_tipo},
       'PENDIENTE', 0, ${idempotencyKey})
    ON CONFLICT (idempotency_key) DO NOTHING
  `;
}

// ---------------------------------------------------------------------------
// Canales — implementaciones / stubs
// ---------------------------------------------------------------------------

async function sendPush(
  notifId: string,
  alerta_id: string,
  nivel: NivelAlerta,
  titulo: string,
  municipios_ids: string[],
): Promise<void> {
  if (!fcmApp) {
    throw new Error('FCM no inicializado');
  }

  let rows: { token: string }[] = [];
  rows = await db`
    SELECT UNNEST(device_tokens) AS token
    FROM profiles
    WHERE municipio_id = ANY(${db.array(municipios_ids)})
      AND device_tokens IS NOT NULL
      AND array_length(device_tokens, 1) > 0
      AND activo = true
  `;

  const tokens: string[] = rows.map((r) => r.token).filter(Boolean);

  if (tokens.length === 0) {
    logger.info({ notif_id: notifId, alerta_id }, 'Push: no hay tokens registrados');
    await db`
      UPDATE notificaciones
      SET estado = 'ENVIADO', enviados = 0, total_tokens = 0, procesado_at = NOW()
      WHERE id = ${notifId}
    `;
    return;
  }

  const admin = require('firebase-admin') as typeof import('firebase-admin');
  const messaging = admin.messaging(fcmApp);
  const priority: 'high' | 'normal' = nivel === 'ROJO' ? 'high' : 'normal';

  const BATCH_SIZE = 500;
  let totalEnviados = 0;
  let totalFallidos = 0;

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const lote = tokens.slice(i, i + BATCH_SIZE);
    try {
      const response = await messaging.sendEachForMulticast({
        tokens: lote,
        notification: { title: `ALERTA ${nivel}`, body: titulo },
        data: { alerta_id, nivel, tipo: 'ALERTA_EMERGENCIA' },
        android: { priority },
        apns: {
          headers: { 'apns-priority': nivel === 'ROJO' ? '10' : '5' },
        },
      });
      totalEnviados += response.successCount;
      totalFallidos += response.failureCount;
    } catch (err) {
      logger.error({ err, lote_inicio: i, notif_id: notifId }, 'Error enviando lote FCM');
      totalFallidos += lote.length;
    }
  }

  await db`
    UPDATE notificaciones
    SET estado = 'ENVIADO',
        total_tokens = ${tokens.length},
        enviados = ${totalEnviados},
        fallidos = ${totalFallidos},
        procesado_at = NOW()
    WHERE id = ${notifId}
  `;
}

async function sendTelegram(
  notifId: string,
  nivel: NivelAlerta,
  titulo: string,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    logger.warn({ notif_id: notifId }, 'Telegram no configurado — TELEGRAM_BOT_TOKEN/CHAT_ID ausentes');
    // Marcar como enviado (no-op) para no bloquear la cola
    await db`
      UPDATE notificaciones SET estado = 'ENVIADO', procesado_at = NOW()
      WHERE id = ${notifId}
    `;
    return;
  }

  const text = `🚨 ALERTA ${nivel}\n${titulo}`;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body}`);
  }

  await db`
    UPDATE notificaciones SET estado = 'ENVIADO', enviados = 1, procesado_at = NOW()
    WHERE id = ${notifId}
  `;
}

async function sendWhatsApp(
  notifId: string,
  nivel: NivelAlerta,
  titulo: string,
): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const recipient = process.env.WHATSAPP_RECIPIENT_PHONE;

  if (!token || !phoneId || !recipient) {
    logger.warn({ notif_id: notifId }, 'WhatsApp no configurado — stub sin envío');
    await db`
      UPDATE notificaciones SET estado = 'ENVIADO', procesado_at = NOW()
      WHERE id = ${notifId}
    `;
    return;
  }

  const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'text',
      text: { body: `ALERTA ${nivel}: ${titulo}` },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp API ${res.status}: ${body}`);
  }

  await db`
    UPDATE notificaciones SET estado = 'ENVIADO', enviados = 1, procesado_at = NOW()
    WHERE id = ${notifId}
  `;
}

// ---------------------------------------------------------------------------
// Worker — procesa cola cada 30 s
// ---------------------------------------------------------------------------

let workerRunning = false;

export async function processNotificationQueue(): Promise<void> {
  if (workerRunning) return; // evitar ejecuciones solapadas
  workerRunning = true;

  try {
    // Seleccionar hasta 100 filas PENDIENTES listas para procesar (SKIP LOCKED = sin bloqueo)
    const pendientes = await db`
      SELECT id, canal, alerta_id, nivel, titulo, municipios_ids, reintentos
      FROM notificaciones
      WHERE estado = 'PENDIENTE'
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY created_at
      LIMIT 100
      FOR UPDATE SKIP LOCKED
    `;

    if (pendientes.length === 0) {
      return;
    }

    logger.info({ count: pendientes.length }, 'Procesando cola de notificaciones');

    for (const row of pendientes) {
      const { id, canal, alerta_id, nivel, titulo, municipios_ids, reintentos } = row as {
        id: string;
        canal: CanalNotificacion;
        alerta_id: string;
        nivel: NivelAlerta;
        titulo: string;
        municipios_ids: string[];
        reintentos: number;
      };

      try {
        switch (canal) {
          case 'PUSH':
            await sendPush(id, alerta_id, nivel, titulo, municipios_ids ?? []);
            break;
          case 'TELEGRAM':
            await sendTelegram(id, nivel, titulo);
            break;
          case 'WHATSAPP':
            await sendWhatsApp(id, nivel, titulo);
            break;
          default:
            logger.warn({ notif_id: id, canal }, 'Canal desconocido — marcando como fallido');
            await db`
              UPDATE notificaciones
              SET estado = 'FALLIDO', error_detalle = 'Canal no soportado'
              WHERE id = ${id}
            `;
        }

        logger.info({ notif_id: id, canal }, 'Notificacion enviada');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const nuevoReintentos = reintentos + 1;

        if (nuevoReintentos >= 3) {
          // Agotar reintentos — marcar definitivamente fallido
          await db`
            UPDATE notificaciones
            SET estado = 'FALLIDO',
                reintentos = ${nuevoReintentos},
                error_detalle = ${errorMsg},
                procesado_at = NOW()
            WHERE id = ${id}
          `;
          logger.error({ notif_id: id, canal, error: errorMsg }, 'Notificacion fallida definitivamente');
        } else {
          // Backoff exponencial: 1 min, 4 min, 16 min (base 4^n minutos)
          const delayMinutes = Math.pow(4, nuevoReintentos);
          await db`
            UPDATE notificaciones
            SET reintentos = ${nuevoReintentos},
                error_detalle = ${errorMsg},
                next_retry_at = NOW() + (${delayMinutes} || ' minutes')::INTERVAL
            WHERE id = ${id}
          `;
          logger.warn({ notif_id: id, canal, reintentos: nuevoReintentos, delay_min: delayMinutes }, 'Reintento programado');
        }
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error en processNotificationQueue');
  } finally {
    workerRunning = false;
  }
}

// ---------------------------------------------------------------------------
// Compatibilidad hacia atrás: enviarAlertaPush encola en lugar de enviar directo
// ---------------------------------------------------------------------------

export async function enviarAlertaPush(
  alertaId: string,
  nivel: NivelAlerta,
  titulo: string,
  municipiosIds: string[],
): Promise<void> {
  const idempotencyKey = `push:${alertaId}`;
  await enqueueNotification(
    { alerta_id: alertaId, canal: 'PUSH', nivel, titulo, municipios_ids: municipiosIds },
    idempotencyKey,
  );
  logger.info({ alerta_id: alertaId, nivel }, 'Push encolado');
}
