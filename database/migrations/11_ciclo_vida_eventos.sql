-- =============================================================================
-- Migración 11: Ciclo de vida completo de eventos SATAM
-- Fecha: 2026-06-10
-- IMPORTANTE: Revisar manualmente antes de ejecutar en producción
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Nuevo enum estado_evento_v2
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE estado_evento_v2 AS ENUM (
    'PENDIENTE',
    'CONFIRMADO',
    'EN_CURSO',
    'CONTROLADO',
    'CERRADO',
    'FALSO_POSITIVO',
    'CANCELADO'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. Modificaciones a tabla incidentes
-- =============================================================================

ALTER TABLE incidentes
  ADD COLUMN IF NOT EXISTS es_simulacro     BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS nivel_confianza  SMALLINT    DEFAULT 50,
  ADD COLUMN IF NOT EXISTS confirmado_por   UUID        REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS confirmado_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS controlado_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;

-- Constraint idempotente para nivel_confianza
DO $$ BEGIN
  ALTER TABLE incidentes
    ADD CONSTRAINT incidentes_nivel_confianza_check
    CHECK (nivel_confianza >= 0 AND nivel_confianza <= 100);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Quitar default para poder cambiar el tipo de columna
ALTER TABLE incidentes ALTER COLUMN estado DROP DEFAULT;

-- Convertir a TEXT para migrar valores libremente
ALTER TABLE incidentes ALTER COLUMN estado TYPE TEXT;

-- Migrar valores del enum viejo al nuevo
UPDATE incidentes SET estado = 'EN_CURSO'       WHERE estado IN ('ABIERTO', 'EN_ATENCION');
UPDATE incidentes SET estado = 'FALSO_POSITIVO' WHERE estado = 'FALSA_ALARMA';
UPDATE incidentes SET estado = 'EN_CURSO'       WHERE estado NOT IN ('PENDIENTE','CONFIRMADO','EN_CURSO','CONTROLADO','CERRADO','FALSO_POSITIVO','CANCELADO');

-- Castear al nuevo enum
ALTER TABLE incidentes
  ALTER COLUMN estado TYPE estado_evento_v2
  USING estado::estado_evento_v2;

-- Restaurar default con el nuevo enum
ALTER TABLE incidentes ALTER COLUMN estado SET DEFAULT 'PENDIENTE'::estado_evento_v2;

-- =============================================================================
-- 3. Nueva tabla transiciones_evento
-- =============================================================================

CREATE TABLE IF NOT EXISTS transiciones_evento (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  incidente_id   UUID        NOT NULL REFERENCES incidentes(id) ON DELETE CASCADE,
  estado_origen  TEXT        NOT NULL,
  estado_destino TEXT        NOT NULL,
  actor_id       UUID        REFERENCES profiles(id),
  rol_actor      TEXT,
  motivo         TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. Nueva tabla informes_evento
-- =============================================================================

CREATE TABLE IF NOT EXISTS informes_evento (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  incidente_id          UUID        UNIQUE NOT NULL REFERENCES incidentes(id),
  cronologia            JSONB       DEFAULT '[]',
  organismos_participantes JSONB    DEFAULT '[]',
  recursos_usados       JSONB       DEFAULT '{}',
  total_afectados       INT         DEFAULT 0,
  total_evacuados       INT         DEFAULT 0,
  danos                 JSONB       DEFAULT '{}',
  lecciones_aprendidas  TEXT,
  pdf_url               TEXT,
  hash_documento        TEXT,
  firmado_por           UUID        REFERENCES profiles(id),
  firmado_at            TIMESTAMPTZ,
  estado_informe        TEXT        DEFAULT 'BORRADOR',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN
  ALTER TABLE informes_evento
    ADD CONSTRAINT informes_evento_estado_informe_check
    CHECK (estado_informe IN ('BORRADOR','REVISION','FIRMADO','PUBLICADO'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 5. Nueva tabla participacion_organismo
-- =============================================================================

CREATE TABLE IF NOT EXISTS participacion_organismo (
  id                   UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  incidente_id         UUID        NOT NULL REFERENCES incidentes(id),
  organismo_id         UUID        NOT NULL REFERENCES organismos(id),
  rol_en_evento        TEXT,
  hora_activacion      TIMESTAMPTZ,
  hora_arribo          TIMESTAMPTZ,
  hora_retiro          TIMESTAMPTZ,
  personal_desplegado  INT,
  reporte_actividades  TEXT,
  recursos_aportados   JSONB       DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. Índices
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_transiciones_evento_incidente_id
  ON transiciones_evento(incidente_id);

CREATE INDEX IF NOT EXISTS idx_informes_evento_incidente_id
  ON informes_evento(incidente_id);

CREATE INDEX IF NOT EXISTS idx_participacion_organismo_incidente_id
  ON participacion_organismo(incidente_id);

CREATE INDEX IF NOT EXISTS idx_participacion_organismo_organismo_id
  ON participacion_organismo(organismo_id);

COMMIT;
