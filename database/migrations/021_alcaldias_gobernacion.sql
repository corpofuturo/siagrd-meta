-- 021: Alcaldías municipales y Gobernación Departamental

BEGIN;

-- Nuevos roles
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'ALCALDIA';
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'GOBERNACION';

-- Tabla alcaldias (una por municipio)
CREATE TABLE IF NOT EXISTS alcaldias (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  municipio_id  UUID NOT NULL REFERENCES municipios(id),
  nombre        TEXT NOT NULL,
  alcalde       TEXT,
  secretaria    TEXT,
  correo        TEXT,
  telefono      TEXT,
  direccion     TEXT,
  lider_id      UUID REFERENCES profiles(id),
  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (municipio_id)
);

CREATE INDEX IF NOT EXISTS idx_alcaldias_municipio ON alcaldias(municipio_id);
CREATE INDEX IF NOT EXISTS idx_alcaldias_lider     ON alcaldias(lider_id);

-- Tabla gobernacion_departamental (singleton por departamento)
CREATE TABLE IF NOT EXISTS gobernacion_departamental (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento_id  UUID NOT NULL REFERENCES departamentos(id),
  nombre           TEXT NOT NULL DEFAULT 'Dirección de Gestión del Riesgo',
  director         TEXT,
  correo           TEXT,
  telefono         TEXT,
  direccion        TEXT,
  lider_id         UUID REFERENCES profiles(id),
  activo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (departamento_id)
);

CREATE INDEX IF NOT EXISTS idx_gobernacion_depto ON gobernacion_departamental(departamento_id);
CREATE INDEX IF NOT EXISTS idx_gobernacion_lider ON gobernacion_departamental(lider_id);

-- Vincular profiles a alcaldía y gobernación
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alcaldia_id     UUID REFERENCES alcaldias(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gobernacion_id  UUID REFERENCES gobernacion_departamental(id);

CREATE INDEX IF NOT EXISTS idx_profiles_alcaldia    ON profiles(alcaldia_id);
CREATE INDEX IF NOT EXISTS idx_profiles_gobernacion ON profiles(gobernacion_id);

COMMIT;
