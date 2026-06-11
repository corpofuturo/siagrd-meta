import postgres from 'postgres';
import { readFileSync } from 'fs';
const sql = postgres('postgresql://siagrd:siagrd2026@viaduct.proxy.rlwy.net:56926/siagrd', { ssl: 'require', max: 1 });
const content = readFileSync('database/migrations/016_colombia_geo_parte2.sql', 'utf8');
try {
  await sql.unsafe(content);
  console.log('OK — migración 016 ejecutada');
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await sql.end();
}
