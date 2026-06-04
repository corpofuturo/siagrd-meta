import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

/**
 * Cache local de municipios con niveles de riesgo por tipo de amenaza.
 * Permite clasificar incidentes sin conexión.
 */
export class MunicipioCache extends Model {
  static table = 'municipios_cache';

  @field('server_id') serverId!: string;
  @field('nombre') nombre!: string;
  @field('nivel_riesgo_inundacion') nivelRiesgoInundacion!: number;
  @field('nivel_riesgo_remocion') nivelRiesgoRemocion!: number;
  @field('nivel_riesgo_sismico') nivelRiesgoSismico!: number;
  @readonly @date('cached_at') cachedAt!: number;
}
