/** URL base de la API SIAGRD. Configurable via variable de entorno Expo. */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://backend-production-60016.up.railway.app/api/v1';

/** Intervalo de sincronización automática en milisegundos (60 segundos). */
export const SYNC_INTERVAL_MS = 60_000;

/** Número máximo de intentos de sincronización antes de marcar como error. */
export const MAX_SYNC_INTENTOS = 5;

/** Umbral de precisión GPS en metros para mostrar advertencia al usuario. */
export const GPS_PRECISION_WARNING_M = 100;
