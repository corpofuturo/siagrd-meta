import { logger } from '../utils/logger.js';
import type { TipoAmenaza, NivelAlerta } from '../types/domain.js';

export interface IdeamAlerta {
  tipo: TipoAmenaza;
  nivel: NivelAlerta;
  descripcion: string;
  municipios_codigo_dane: string[];
  vigencia_horas: number;
  fuente: 'IDEAM';
  timestamp: string;
}

let lastCheck = '';

/**
 * Retorna alertas vigentes del IDEAM.
 * NOTA DT-001: La API real del IDEAM no está disponible públicamente; se requiere
 * convenio interinstitucional. Esta implementación usa datos mock hasta obtener
 * credenciales oficiales.
 */
export async function getAlertas(): Promise<IdeamAlerta[]> {
  lastCheck = new Date().toISOString();

  logger.info({ service: 'ideam', mode: 'mock' }, 'Consultando alertas IDEAM [MOCK]');

  return [
    {
      tipo: 'INUNDACION',
      nivel: 'AMARILLO',
      descripcion:
        'Alerta amarilla por lluvias intensas en la cuenca del río Cauca. ' +
        'Se esperan precipitaciones superiores a 50mm en 24h. [MOCK - DT-001]',
      municipios_codigo_dane: ['05088', '05197', '05266', '05308'],
      vigencia_horas: 48,
      fuente: 'IDEAM',
      timestamp: lastCheck,
    },
  ];
}

/** Retorna timestamp de la última consulta al servicio IDEAM */
export function getLastCheck(): string {
  return lastCheck;
}

/** Estado del servicio */
export function getStatus(): 'mock' {
  return 'mock';
}
