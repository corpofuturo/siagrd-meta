import postgres from 'postgres';
const sql = postgres('postgresql://siagrd:siagrd2026@viaduct.proxy.rlwy.net:56926/siagrd', { ssl: 'require', max: 1 });
try {
  await sql.unsafe(`
    ALTER TABLE chats ADD COLUMN IF NOT EXISTS municipio_id UUID REFERENCES municipios(id);

    DO $$ BEGIN
      CREATE TYPE tipo_mensaje AS ENUM ('TEXTO','IMAGEN','ALERTA_OFICIAL','SISTEMA');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE TABLE IF NOT EXISTS mensajes_chat (
      id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      chat_id    UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      autor_id   UUID REFERENCES profiles(id),
      tipo       tipo_mensaje NOT NULL DEFAULT 'TEXTO',
      contenido  TEXT NOT NULL,
      metadata   JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_mensajes_chat ON mensajes_chat(chat_id, created_at DESC);

    INSERT INTO chats (tipo, nombre)
    SELECT 'GENERAL', 'Canal General Operadores'
    WHERE NOT EXISTS (SELECT 1 FROM chats WHERE tipo = 'GENERAL');
  `);
  console.log('OK — tablas chat actualizadas');
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await sql.end();
}
