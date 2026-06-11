import { logger } from '../utils/logger.js';

export interface WhatsAppResult {
  sent: boolean;
  reason?: string;
  messageId?: string;
}

/**
 * Envía un mensaje de WhatsApp usando un template aprobado en Meta Business.
 *
 * Requiere variables de entorno:
 *   WHATSAPP_TOKEN    — token de acceso (Meta Cloud API)
 *   WHATSAPP_PHONE_ID — ID del número de teléfono origen en Meta
 *
 * El template ALERTA_EMERGENCIA (o el definido en WHATSAPP_TEMPLATE_ALERTA)
 * debe estar aprobado en Meta Business Manager antes de usar en producción.
 *
 * @param phoneNumber  Número destino en formato E.164 (ej: "+573001234567")
 * @param templateName Nombre del template aprobado en Meta
 * @param params       Parámetros posicionales del template ({{1}}, {{2}}, ...)
 */
export async function sendWhatsApp(
  phoneNumber: string,
  templateName: string,
  params: string[],
): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    logger.warn(
      { service: 'whatsapp', phoneNumber, templateName },
      'WHATSAPP_TOKEN o WHATSAPP_PHONE_ID no configurados — mensaje no enviado',
    );
    return { sent: false, reason: 'not_configured' };
  }

  const url = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to: phoneNumber,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'es' },
      components: params.length > 0
        ? [
            {
              type: 'body',
              parameters: params.map((text) => ({ type: 'text', text })),
            },
          ]
        : [],
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      logger.error(
        { service: 'whatsapp', phoneNumber, templateName, status: response.status, data },
        'Error de la API de Meta WhatsApp',
      );
      return { sent: false, reason: `api_error_${response.status}` };
    }

    const messages = data.messages as Array<{ id: string }> | undefined;
    const messageId = messages?.[0]?.id;

    logger.info(
      { service: 'whatsapp', phoneNumber, templateName, messageId },
      'WhatsApp enviado correctamente',
    );

    return { sent: true, messageId };
  } catch (err) {
    logger.error(
      { err, service: 'whatsapp', phoneNumber, templateName },
      'Excepción enviando WhatsApp — mensaje no enviado',
    );
    return { sent: false, reason: 'exception' };
  }
}
