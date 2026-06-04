import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { Incidente } from './models/Incidente';
import { Actualizacion } from './models/Actualizacion';
import { ArchivoPendiente } from './models/ArchivoPendiente';
import { AlertaCache } from './models/AlertaCache';
import { MunicipioCache } from './models/MunicipioCache';

/**
 * Singleton de base de datos WatermelonDB con adaptador SQLite (JSI habilitado).
 * Usar este objeto en toda la aplicación; nunca instanciar Database directamente.
 */
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'siagrd_socorro',
  jsi: true,
  onSetUpError: (error) => {
    console.error('[DB] Error al inicializar SQLite:', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    Incidente,
    Actualizacion,
    ArchivoPendiente,
    AlertaCache,
    MunicipioCache,
  ],
});

export { Incidente, Actualizacion, ArchivoPendiente, AlertaCache, MunicipioCache };
