import postgres from 'postgres';
const sql = postgres('postgresql://siagrd:siagrd2026@viaduct.proxy.rlwy.net:56926/siagrd', { ssl: 'require', max: 1 });
const r = await sql.unsafe("SELECT unnest(enum_range(NULL::tipo_amenaza))::text as v");
console.log('tipo_amenaza:', r.map(x => x.v).join(', '));
await sql.end();
