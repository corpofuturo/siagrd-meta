import { db } from '../lib/db.js';
import { logger } from '../utils/logger.js';

export type TelegramSendResult =
  | { sent: true }
  | { sent: false; reason?: string; error?: string };

export async function sendTelegramMessage(
  chatId: string,
  mensaje: string,
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    logger.warn({ chat_id: chatId }, 'TELEGRAM_BOT_TOKEN no configurado — mensaje no enviado (modo stub)');
    return { sent: false, reason: 'not_configured' };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: mensaje, parse_mode: 'HTML' }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn({ chat_id: chatId, status: res.status, body }, 'Telegram API respondió con error');
      return { sent: false, error: `HTTP ${res.status}: ${body}` };
    }

    return { sent: true };
  } catch (err: any) {
    logger.error({ err, chat_id: chatId }, 'Error de red enviando mensaje Telegram');
    return { sent: false, error: err?.message ?? 'network_error' };
  }
}

export async function broadcastTelegramByMunicipio(
  codigoDane: string,
  mensaje: string,
): Promise<{ enviados: number; fallidos: number }> {
  let profiles: { telegram_chat_id: string }[] = [];

  try {
    profiles = await db<{ telegram_chat_id: string }[]>`
      SELECT telegram_chat_id
      FROM profiles
      WHERE municipio_codigo = ${codigoDane}
        AND telegram_chat_id IS NOT NULL
        AND activo = true
    `;
  } catch (err) {
    logger.error({ err, codigo_dane: codigoDane }, 'Error consultando profiles para broadcast Telegram');
    return { enviados: 0, fallidos: 0 };
  }

  let enviados = 0;
  let fallidos = 0;

  for (const profile of profiles) {
    const result = await sendTelegramMessage(profile.telegram_chat_id, mensaje);
    if (result.sent) {
      enviados++;
    } else {
      fallidos++;
    }
  }

  logger.info({ codigo_dane: codigoDane, enviados, fallidos }, 'Broadcast Telegram completado');
  return { enviados, fallidos };
}
