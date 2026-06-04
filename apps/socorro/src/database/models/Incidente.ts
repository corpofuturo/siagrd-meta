import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

/**
 * Modelo local de incidente de gestión del riesgo.
 * Funciona 100% offline; se sincroniza con el servidor cuando hay conexión.
 */
export class Incidente extends Model {
  static table = 'incidentes';

  @field('server_id') serverId!: string | null;
  @field('codigo') codigo!: string;
  @field('titulo') titulo!: string;
  @field('descripcion') descripcion!: string | null;
  @field('tipo_amenaza') tipoAmenaza!: string;
  @field('estado') estado!: string;
  @field('nivel_alerta') nivelAlerta!: string;
  @field('lat') lat!: number;
  @field('lng') lng!: number;
  @field('altitud') altitud!: number | null;
  @field('precision_gps') precisionGps!: number | null;
  @field('municipio_id') municipioId!: string;
  @field('afectados_estimado') afectadosEstimado!: number | null;
  @field('synced') synced!: boolean;
  @field('sync_error') syncError!: string | null;
  @readonly @date('created_at_local') createdAtLocal!: number;
  @readonly @date('updated_at_local') updatedAtLocal!: number;
}
