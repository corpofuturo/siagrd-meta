-- Migración 019: configuracion, comites_gestion_riesgo, juntas_accion_comunal

-- Enum tipo de comité
DO $$ BEGIN
  CREATE TYPE tipo_comite AS ENUM ('CONGRD','CDGRD','SDGRD','CMGRD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Configuración del sistema (singleton)
CREATE TABLE IF NOT EXISTS configuracion (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_sistema      TEXT NOT NULL DEFAULT 'SIAGRD',
  departamento_id     UUID REFERENCES municipios(id),
  nombre_departamento TEXT,
  codigo_dane         TEXT,
  ungrd_correo        TEXT,
  ungrd_url           TEXT,
  activo              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comités de Gestión del Riesgo
CREATE TABLE IF NOT EXISTS comites_gestion_riesgo (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo         tipo_comite NOT NULL,
  nombre       TEXT NOT NULL,
  municipio_id UUID REFERENCES municipios(id),
  presidente   TEXT,
  secretario   TEXT,
  correo       TEXT,
  telefono     TEXT,
  direccion    TEXT,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comites_tipo       ON comites_gestion_riesgo(tipo);
CREATE INDEX IF NOT EXISTS idx_comites_municipio  ON comites_gestion_riesgo(municipio_id);
CREATE INDEX IF NOT EXISTS idx_comites_activo     ON comites_gestion_riesgo(activo);

-- Juntas de Acción Comunal / Local
CREATE TABLE IF NOT EXISTS juntas_accion_comunal (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  barrio_vereda TEXT,
  municipio_id  UUID REFERENCES municipios(id),
  presidente    TEXT,
  correo        TEXT,
  telefono      TEXT,
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jal_municipio ON juntas_accion_comunal(municipio_id);
CREATE INDEX IF NOT EXISTS idx_jal_activo    ON juntas_accion_comunal(activo);

-- Columna comite_id en profiles (opcional, para vincular usuarios a comités)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS comite_id UUID REFERENCES comites_gestion_riesgo(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS jal_id    UUID REFERENCES juntas_accion_comunal(id);

CREATE INDEX IF NOT EXISTS idx_profiles_comite ON profiles(comite_id);
CREATE INDEX IF NOT EXISTS idx_profiles_jal    ON profiles(jal_id);
