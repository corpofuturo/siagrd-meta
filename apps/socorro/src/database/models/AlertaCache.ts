import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

/**
 * Cache local de alertas activas descargadas del servidor.
 * Disponible sin conexión para mostrar el nivel de alerta vigente.
 */
export class AlertaCache extends Model {
  static table = 'alertas_cache';

  @field('server_id') serverId!: string;
  @field('tipo') tipo!: string;
  @field('nivel') nivel!: string;
  @field('titulo') titulo!: string;
  @field('instrucciones_ciudadano') instruccionesCiudadano!: string;
  @field('instrucciones_socorro') instruccionesSocorro!: string | null;
  @field('activa') activa!: boolean;
  @readonly @date('cached_at') cachedAt!: number;
}
