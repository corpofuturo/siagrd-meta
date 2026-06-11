-- =============================================================================
-- Migración 018: Organismos de socorro y relación con perfiles
-- =============================================================================

BEGIN;

DO $$ BEGIN
  CREATE TYPE tipo_organismo AS ENUM ('BOMBEROS','CRUZ_ROJA','DEFENSA_CIVIL','POLICIA','EJERCITO','SALUD','OTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS organismos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre       TEXT NOT NULL,
  tipo         tipo_organismo NOT NULL DEFAULT 'OTRO',
  funciones    TEXT,
  ubicacion    TEXT,
  municipio_id UUID REFERENCES municipios(id),
  correo       TEXT,
  celular      TEXT,
  director_id  UUID REFERENCES profiles(id),
  activo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organismos_municipio ON organismos(municipio_id);
CREATE INDEX IF NOT EXISTS idx_organismos_director  ON organismos(director_id);

-- Columna organismo_id en profiles (puede ya existir)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organismo_id UUID REFERENCES organismos(id);
CREATE INDEX IF NOT EXISTS idx_profiles_organismo ON profiles(organismo_id);

-- Columna documento (cédula) en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS documento TEXT;

-- Columna celular en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS celular TEXT;

COMMIT;
