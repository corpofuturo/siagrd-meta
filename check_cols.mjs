import postgres from 'postgres';
const sql = postgres('postgresql://siagrd:siagrd2026@viaduct.proxy.rlwy.net:56926/siagrd', { ssl: 'require', max: 1 });
const r = await sql.unsafe("SELECT column_name FROM information_schema.columns WHERE table_name='incidentes' ORDER BY ordinal_position");
console.log(r.map(c => c.column_name).join(', '));
await sql.end();
