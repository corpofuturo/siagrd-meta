import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * Schema WatermelonDB versión 3 para SIAGRD Socorro.
 * 5 tablas: incidentes, actualizaciones, archivos_pendientes,
 * alertas_cache, municipios_cache.
 */
export const schema = appSchema({
  version: 3,
  tables: [
    tableSchema({
      name: 'incidentes',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'codigo', type: 'string' },
        { name: 'titulo', type: 'string' },
        { name: 'descripcion', type: 'string', isOptional: true },
        { name: 'tipo_amenaza', type: 'string' },
        { name: 'estado', type: 'string' },
        { name: 'nivel_alerta', type: 'string' },
        { name: 'lat', type: 'number' },
        { name: 'lng', type: 'number' },
        { name: 'altitud', type: 'number', isOptional: true },
        { name: 'precision_gps', type: 'number', isOptional: true },
        { name: 'municipio_id', type: 'string' },
        { name: 'afectados_estimado', type: 'number', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'sync_error', type: 'string', isOptional: true },
        { name: 'created_at_local', type: 'number' },
        { name: 'updated_at_local', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'actualizaciones',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'incidente_id', type: 'string' },
        { name: 'texto', type: 'string' },
        { name: 'lat', type: 'number', isOptional: true },
        { name: 'lng', type: 'number', isOptional: true },
        { name: 'synced', type: 'boolean' },
        { name: 'created_at_local', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'archivos_pendientes',
      columns: [
        { name: 'incidente_id', type: 'string' },
        { name: 'uri_local', type: 'string' },
        { name: 'miniatura_uri', type: 'string', isOptional: true },
        { name: 'lat', type: 'number', isOptional: true },
        { name: 'lng', type: 'number', isOptional: true },
        { name: 'tamano_bytes', type: 'number', isOptional: true },
        { name: 'subido', type: 'boolean' },
        { name: 'error', type: 'string', isOptional: true },
        { name: 'created_at_local', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'alertas_cache',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'tipo', type: 'string' },
        { name: 'nivel', type: 'string' },
        { name: 'titulo', type: 'string' },
        { name: 'instrucciones_ciudadano', type: 'string' },
        { name: 'instrucciones_socorro', type: 'string', isOptional: true },
        { name: 'activa', type: 'boolean' },
        { name: 'cached_at', type: 'number' },
      ],
    }),

    tableSchema({
      name: 'municipios_cache',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'nombre', type: 'string' },
        { name: 'nivel_riesgo_inundacion', type: 'number' },
        { name: 'nivel_riesgo_remocion', type: 'number' },
        { name: 'nivel_riesgo_sismico', type: 'number' },
        { name: 'cached_at', type: 'number' },
      ],
    }),
  ],
});
