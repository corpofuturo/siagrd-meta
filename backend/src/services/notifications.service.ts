import { db } from '../lib/db.js';
import { logger } from '../utils/logger.js';
import type { NivelAlerta } from '../types/domain.js';

let twilioClient: import('twilio').Twilio | null = null;

/**
 * Retorna el cliente Twilio, inicializándolo de forma lazy si las credenciales están disponibles.
 */
function getTwilioClient(): import('twilio').Twilio | null {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  try {
    const twilio = require('twilio') as typeof import('twilio');
    twilioClient = twilio(accountSid, authToken);
    return twilioClient;
  } catch (err) {
    logger.error({ err, service: 'sms' }, 'Error inicializando cliente Twilio');
    return null;
  }
}

/**
 * Envía un SMS a un teléfono destino.
 * Si las credenciales Twilio no están configuradas, retorna false sin crash.
 */
export async function enviarSMS(telefono: string, mensaje: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  if (!accountSid) {
    logger.warn({ service: 'sms' }, 'TWILIO_ACCOUNT_SID no configurado — SMS deshabilitado');
    return false;
  }

  const client = getTwilioClient();
  if (!client) {
    logger.warn({ service: 'sms', telefono }, 'Cliente Twilio no disponible — SMS no enviado');
    return false;
  }

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    logger.warn({ service: 'sms' }, 'TWILIO_PHONE_NUMBER no configurado — SMS no enviado');
    return false;
  }

  try {
    const result = await client.messages.create({ to: telefono, from, body: mensaje });
    logger.info({ service: 'sms', telefono, sid: result.sid }, 'SMS enviado');
    return true;
  } catch (err) {
    logger.error({ err, service: 'sms', telefono }, 'Error enviando SMS');
    return false;
  }
}

/**
 * Envía SMS de alerta a múltiples teléfonos en lotes de 10.
 */
export async function enviarSMSAlerta(
  alerta: { tipo: string; nivel: NivelAlerta; instrucciones: string },
  telefonos: string[],
): Promise<void> {
  if (telefonos.length === 0) return;

  const instruccionesCortas = alerta.instrucciones.slice(0, 100);
  const mensaje = `ALERTA ${alerta.nivel} - ${alerta.tipo}. ${instruccionesCortas}. Info: siagrd.meta.gov.co`;

  const BATCH_SIZE = 10;
  let totalOk = 0;
  let totalFallidos = 0;

  for (let i = 0; i < telefonos.length; i += BATCH_SIZE) {
    const lote = telefonos.slice(i, i + BATCH_SIZE);
    const resultados = await Promise.allSettled(lote.map((tel) => enviarSMS(tel, mensaje)));

    for (const r of resultados) {
      if (r.status === 'fulfilled' && r.value) {
        totalOk++;
      } else {
        totalFallidos++;
      }
    }
  }

  logger.info(
    { nivel: alerta.nivel, tipo: alerta.tipo, ok: totalOk, fallidos: totalFallidos },
    'SMS alerta completado',
  );
}

let fcmApp: import('firebase-admin').app.App | null = null;

/**
 * Inicializa Firebase Admin SDK para FCM.
 * Si las variables de entorno no están configuradas, el servicio opera en modo graceful (no-op).
 */
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

/**
 * Envía alerta push a todos los dispositivos de los municipios afectados.
 * Envía en lotes de 500 (límite FCM).
 * Si FCM no está inicializado, registra warning y retorna sin error.
 */
export async function enviarAlertaPush(
  alertaId: string,
  nivel: NivelAlerta,
  titulo: string,
  municipiosIds: string[],
): Promise<void> {
  if (!fcmApp) {
    logger.warn(
      { alerta_id: alertaId },
      'FCM no inicializado — push no enviado (modo graceful)',
    );
    return;
  }

  // Obtener tokens de dispositivos activos en los municipios afectados
  let profiles: { device_token: string | null }[] = [];
  try {
    profiles = await db`
      SELECT device_token
      FROM profiles
      WHERE municipio_id = ANY(${db.array(municipiosIds)})
        AND device_token IS NOT NULL
        AND activo = true
    `;
  } catch (err) {
    logger.error({ err, alerta_id: alertaId }, 'Error obteniendo device_tokens');
    return;
  }

  const tokens: string[] = profiles
    .map((p) => p.device_token)
    .filter((t): t is string => Boolean(t));

  if (tokens.length === 0) {
    logger.info({ alerta_id: alertaId }, 'No hay tokens registrados para los municipios');
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
        notification: { title: `🚨 ALERTA ${nivel}`, body: titulo },
        data: { alerta_id: alertaId, nivel, tipo: 'ALERTA_EMERGENCIA' },
        android: { priority },
        apns: {
          headers: { 'apns-priority': nivel === 'ROJO' ? '10' : '5' },
        },
      });
      totalEnviados += response.successCount;
      totalFallidos += response.failureCount;
    } catch (err) {
      logger.error({ err, lote_inicio: i, alerta_id: alertaId }, 'Error enviando lote FCM');
      totalFallidos += lote.length;
    }
  }

  // Registrar en tabla notificaciones
  const estado = totalFallidos === tokens.length ? 'error' : totalEnviados > 0 ? 'ok' : 'sin_tokens';
  await db`
    INSERT INTO notificaciones (alerta_id, nivel, titulo, municipios_ids, total_tokens, enviados, fallidos, estado)
    VALUES (${alertaId}, ${nivel}, ${titulo}, ${db.array(municipiosIds)}, ${tokens.length}, ${totalEnviados}, ${totalFallidos}, ${estado})
  `.catch((err: unknown) => logger.error({ err, alerta_id: alertaId }, 'Error registrando notificacion'));

  logger.info(
    { alerta_id: alertaId, nivel, enviados: totalEnviados, fallidos: totalFallidos },
    'Push enviado',
  );
}
