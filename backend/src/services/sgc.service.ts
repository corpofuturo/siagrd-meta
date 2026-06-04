import { logger } from '../utils/logger.js';

export interface SgcEvento {
  magnitud: number;
  profundidad_km: number;
  lat: number;
  lng: number;
  descripcion_lugar: string;
  fecha: string;
  fuente: 'SGC';
}

let lastCheck = '';

/**
 * Retorna eventos sísmicos recientes del SGC.
 * NOTA DT-002: El acceso a la API del Servicio Geológico Colombiano requiere
 * convenio formal. Esta implementación usa datos mock hasta formalizar el acuerdo.
 */
export async function getEventosRecientes(): Promise<SgcEvento[]> {
  lastCheck = new Date().toISOString();

  logger.info({ service: 'sgc', mode: 'mock' }, 'Consultando eventos SGC [MOCK]');

  return [
    {
      magnitud: 2.1,
      profundidad_km: 8.5,
      lat: 6.2442,
      lng: -75.5812,
      descripcion_lugar:
        '3 km al NE de Medellín, Antioquia — sismo de baja magnitud sin reporte de daños. [MOCK - DT-002]',
      fecha: lastCheck,
      fuente: 'SGC',
    },
  ];
}

/** Retorna timestamp de la última consulta al servicio SGC */
export function getLastCheck(): string {
  return lastCheck;
}

/** Estado del servicio */
export function getStatus(): 'mock' {
  return 'mock';
}
