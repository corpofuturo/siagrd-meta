-- =============================================================================
-- Migración 017: Tablas de chat para SATAM
-- =============================================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE tipo_chat AS ENUM ('PUBLICO_EVENTO','OPERATIVO_EVENTO','GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE tipo_mensaje AS ENUM ('TEXTO','IMAGEN','ALERTA_OFICIAL','SISTEMA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS chats (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo          tipo_chat NOT NULL,
  incidente_id  UUID REFERENCES incidentes(id) ON DELETE CASCADE,
  municipio_id  UUID REFERENCES municipios(id),
  nombre        TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensajes_chat (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id    UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  autor_id   UUID REFERENCES profiles(id),
  tipo       tipo_mensaje NOT NULL DEFAULT 'TEXTO',
  contenido  TEXT NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_incidente    ON chats(incidente_id);
CREATE INDEX IF NOT EXISTS idx_chats_municipio    ON chats(municipio_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_chat      ON mensajes_chat(chat_id, created_at DESC);

-- Canal general de operadores
INSERT INTO chats (tipo, nombre)
VALUES ('GENERAL', 'Canal General Operadores')
ON CONFLICT DO NOTHING;

COMMIT;
