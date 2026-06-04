import * as Sentry from '@sentry/node';

/**
 * Inicializa Sentry con filtro PII.
 * Si SENTRY_DSN no esta configurado, emite advertencia y retorna sin inicializar.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    console.warn('[sentry] SENTRY_DSN no configurado — monitoreo de errores deshabilitado');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'production',
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Redactar cedula de los datos de la peticion
      if (event.request?.data) {
        const data =
          typeof event.request.data === 'string'
            ? (() => {
                try {
                  return JSON.parse(event.request.data);
                } catch {
                  return event.request.data;
                }
              })()
            : event.request.data;

        if (typeof data === 'object' && data !== null) {
          const redacted = { ...data } as Record<string, unknown>;

          if ('cedula' in redacted) redacted['cedula'] = '[REDACTED]';
          if ('numero_documento' in redacted) redacted['numero_documento'] = '[REDACTED]';

          // Redactar coordenadas geograficas
          if ('latitud' in redacted) redacted['latitud'] = '[REDACTED]';
          if ('longitud' in redacted) redacted['longitud'] = '[REDACTED]';
          if ('lat' in redacted) redacted['lat'] = '[REDACTED]';
          if ('lng' in redacted) redacted['lng'] = '[REDACTED]';
          if ('coordinates' in redacted) redacted['coordinates'] = '[REDACTED]';
          if ('ubicacion' in redacted) redacted['ubicacion'] = '[REDACTED]';

          event.request.data = redacted;
        }
      }

      return event;
    },
  });
}

/**
 * Captura un error en Sentry con contexto adicional.
 */
export function captureError(
  error: Error | unknown,
  context?: Record<string, unknown>,
): void {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional', context);
    }
    Sentry.captureException(error);
  });
}
