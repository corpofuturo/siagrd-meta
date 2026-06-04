export interface RateLimitConfig {
  max: number;
  timeWindow: string;
}

/**
 * Retorna configuracion de rate limit segun la ruta recibida.
 * Rutas sensibles tienen limites mas estrictos para prevenir abuso.
 */
export function getRateLimitConfig(route: string): RateLimitConfig {
  if (route.startsWith('/auth/login')) {
    return { max: 5, timeWindow: '15 minutes' };
  }

  if (route.startsWith('/archivos/upload')) {
    return { max: 50, timeWindow: '1 hour' };
  }

  if (route.startsWith('/emitir')) {
    return { max: 10, timeWindow: '1 hour' };
  }

  return { max: 200, timeWindow: '1 minute' };
}
