-- Migration 12: Chat module for SATAM
-- Idempotent: uses IF NOT EXISTS throughout

-- 1. chats
CREATE TABLE IF NOT EXISTS chats (
    id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    tipo        TEXT        NOT NULL CHECK (tipo IN ('PUBLICO_EVENTO','OPERATIVO_EVENTO','GENERAL')),
    incidente_id UUID       REFERENCES incidentes(id) ON DELETE CASCADE,
    nombre      TEXT        NOT NULL,
    activo      BOOLEAN     DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. chat_mensajes
CREATE TABLE IF NOT EXISTS chat_mensajes (
    id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id      UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    autor_id     UUID        REFERENCES profiles(id),
    rol_autor    TEXT        NOT NULL,
    contenido    TEXT        NOT NULL,
    adjunto_url  TEXT,
    tipo_mensaje TEXT        DEFAULT 'TEXTO' CHECK (tipo_mensaje IN ('TEXTO','IMAGEN','ALERTA_OFICIAL','SISTEMA')),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. chat_miembros
CREATE TABLE IF NOT EXISTS chat_miembros (
    chat_id    UUID        NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    profile_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    silenciado BOOLEAN     DEFAULT false,
    joined_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (chat_id, profile_id)
);

-- 4. Canal general permanente
INSERT INTO chats (id, tipo, nombre)
VALUES ('00000000-0000-0000-0000-000000000001', 'GENERAL', 'Canal General Organismos')
ON CONFLICT DO NOTHING;

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_chat_mensajes_chat_id
    ON chat_mensajes (chat_id);

CREATE INDEX IF NOT EXISTS idx_chat_miembros_chat_profile
    ON chat_miembros (chat_id, profile_id);

CREATE INDEX IF NOT EXISTS idx_chats_incidente_id
    ON chats (incidente_id);
