import { db } from '../lib/db.js';
import { logger } from '../utils/logger.js';
import type { NivelAlerta } from '../types/domain.js';

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
// Canales
// ---------------------------------------------------------------------------

async function sendPush(notifId: string): Promise<void> {
  // Push deshabilitado — sin proveedor externo configurado
  logger.info({ notif_id: notifId }, 'Push: canal no configurado — marcando como enviado (no-op)');
  await db`
    UPDATE notificaciones
    SET estado = 'ENVIADO', enviados = 0, total_tokens = 0, procesado_at = NOW()
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
    await db`UPDATE notificaciones SET estado = 'ENVIADO', procesado_at = NOW() WHERE id = ${notifId}`;
    return;
  }

  const text = `🚨 ALERTA ${nivel}\n${titulo}`;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body}`);
  }

  await db`UPDATE notificaciones SET estado = 'ENVIADO', enviados = 1, procesado_at = NOW() WHERE id = ${notifId}`;
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
    await db`UPDATE notificaciones SET estado = 'ENVIADO', procesado_at = NOW() WHERE id = ${notifId}`;
    return;
  }

  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

  await db`UPDATE notificaciones SET estado = 'ENVIADO', enviados = 1, procesado_at = NOW() WHERE id = ${notifId}`;
}

// ---------------------------------------------------------------------------
// Worker — procesa cola cada 30 s
// ---------------------------------------------------------------------------

let workerRunning = false;

export async function processNotificationQueue(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;

  try {
    const pendientes = await db`
      SELECT id, canal, alerta_id, nivel, titulo, municipios_ids, reintentos
      FROM notificaciones
      WHERE estado = 'PENDIENTE'
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY created_at
      LIMIT 100
      FOR UPDATE SKIP LOCKED
    `;

    if (pendientes.length === 0) return;

    logger.info({ count: pendientes.length }, 'Procesando cola de notificaciones');

    for (const row of pendientes) {
      const { id, canal, nivel, titulo, reintentos } = row as {
        id: string; canal: CanalNotificacion; alerta_id: string;
        nivel: NivelAlerta; titulo: string; municipios_ids: string[]; reintentos: number;
      };

      try {
        switch (canal) {
          case 'PUSH':
            await sendPush(id);
            break;
          case 'TELEGRAM':
            await sendTelegram(id, nivel, titulo);
            break;
          case 'WHATSAPP':
            await sendWhatsApp(id, nivel, titulo);
            break;
          default:
            logger.warn({ notif_id: id, canal }, 'Canal desconocido — marcando como fallido');
            await db`UPDATE notificaciones SET estado = 'FALLIDO', error_detalle = 'Canal no soportado' WHERE id = ${id}`;
        }
        logger.info({ notif_id: id, canal }, 'Notificacion enviada');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const nuevoReintentos = reintentos + 1;

        if (nuevoReintentos >= 3) {
          await db`
            UPDATE notificaciones
            SET estado = 'FALLIDO', reintentos = ${nuevoReintentos},
                error_detalle = ${errorMsg}, procesado_at = NOW()
            WHERE id = ${id}
          `;
          logger.error({ notif_id: id, canal, error: errorMsg }, 'Notificacion fallida definitivamente');
        } else {
          const delayMinutes = Math.pow(4, nuevoReintentos);
          await db`
            UPDATE notificaciones
            SET reintentos = ${nuevoReintentos}, error_detalle = ${errorMsg},
                next_retry_at = NOW() + (${delayMinutes} || ' minutes')::INTERVAL
            WHERE id = ${id}
          `;
          logger.warn({ notif_id: id, canal, reintentos: nuevoReintentos }, 'Reintento programado');
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
// Compatibilidad: enviarAlertaPush encola (canal PUSH = no-op hasta configurar)
// ---------------------------------------------------------------------------

export async function enviarAlertaPush(
  alertaId: string,
  nivel: NivelAlerta,
  titulo: string,
  municipiosIds: string[],
): Promise<void> {
  await enqueueNotification(
    { alerta_id: alertaId, canal: 'PUSH', nivel, titulo, municipios_ids: municipiosIds },
    `push:${alertaId}`,
  );
  logger.info({ alerta_id: alertaId, nivel }, 'Push encolado');
}
