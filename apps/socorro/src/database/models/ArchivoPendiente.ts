import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

/**
 * Archivo (foto/video) pendiente de subir al servidor.
 * Se almacena localmente hasta que haya conexión disponible.
 */
export class ArchivoPendiente extends Model {
  static table = 'archivos_pendientes';

  @field('incidente_id') incidenteId!: string;
  @field('uri_local') uriLocal!: string;
  @field('miniatura_uri') miniaturaUri!: string | null;
  @field('lat') lat!: number | null;
  @field('lng') lng!: number | null;
  @field('tamano_bytes') tamanoBbytes!: number | null;
  @field('subido') subido!: boolean;
  @field('error') error!: string | null;
  @readonly @date('created_at_local') createdAtLocal!: number;
}
