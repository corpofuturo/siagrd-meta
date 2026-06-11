import postgres from 'postgres';
import { readFileSync } from 'fs';

const sql = postgres('postgresql://siagrd:siagrd2026@viaduct.proxy.rlwy.net:56926/siagrd', { ssl: 'require', max: 1 });
try {
  const migration = readFileSync('./database/migrations/019_comites_jal_config.sql', 'utf8');
  await sql.unsafe(migration);
  console.log('OK — migración 019 completada');
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await sql.end();
}
