import postgres from 'postgres';
const sql = postgres('postgresql://siagrd:siagrd2026@viaduct.proxy.rlwy.net:56926/siagrd', { ssl: 'require', max: 1 });
const cols = await sql.unsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name IN ('chats','mensajes_chat') ORDER BY table_name, ordinal_position");
console.log(cols.map(c => `${c.table_name}.${c.column_name}: ${c.data_type}`).join('\n'));
await sql.end();
