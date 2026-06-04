import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

/**
 * Actualización de estado de un incidente.
 * Puede contener texto, coordenadas y referencia a archivos adjuntos.
 */
export class Actualizacion extends Model {
  static table = 'actualizaciones';

  @field('server_id') serverId!: string | null;
  @field('incidente_id') incidenteId!: string;
  @field('texto') texto!: string;
  @field('lat') lat!: number | null;
  @field('lng') lng!: number | null;
  @field('synced') synced!: boolean;
  @readonly @date('created_at_local') createdAtLocal!: number;
}
