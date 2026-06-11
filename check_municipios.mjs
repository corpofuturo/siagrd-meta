import postgres from 'postgres';
const sql = postgres('postgresql://siagrd:siagrd2026@viaduct.proxy.rlwy.net:56926/siagrd', { ssl: 'require', max: 1 });
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'municipios' ORDER BY ordinal_position`;
console.log('Columnas municipios:', cols.map(c => c.column_name).join(', '));
const count = await sql`SELECT COUNT(*) as n FROM municipios`;
console.log('Total municipios:', count[0].n);
await sql.end();
