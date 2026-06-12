-- 024: Tabla damnificados robusta

BEGIN;

DO $$ BEGIN
  CREATE TYPE tipo_afectacion_enum AS ENUM ('DAMNIFICADO','AFECTADO','EVACUADO','FALLECIDO','DESAPARECIDO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE dano_vivienda_enum AS ENUM ('SIN_DANO','PARCIAL','TOTAL','INHABITABLE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fuente_registro_enum AS ENUM ('APK','WEB','MANUAL','IMPORTACION');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE damnificados
  ADD COLUMN IF NOT EXISTS telefono              TEXT,
  ADD COLUMN IF NOT EXISTS tipo_afectacion       tipo_afectacion_enum NOT NULL DEFAULT 'DAMNIFICADO',
  ADD COLUMN IF NOT EXISTS dano_vivienda         dano_vivienda_enum NOT NULL DEFAULT 'SIN_DANO',
  ADD COLUMN IF NOT EXISTS tipo_vivienda         TEXT,
  ADD COLUMN IF NOT EXISTS fuente_registro       fuente_registro_enum NOT NULL DEFAULT 'APK',
  ADD COLUMN IF NOT EXISTS num_hombres           INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS num_mujeres           INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS num_ninos             INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS num_adultos_mayores   INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS num_discapacitados    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS organismo_atiende_id  UUID REFERENCES organismos(id),
  ADD COLUMN IF NOT EXISTS alcaldia_atiende_id   UUID REFERENCES alcaldias(id),
  ADD COLUMN IF NOT EXISTS notas_atencion        TEXT;

CREATE INDEX IF NOT EXISTS idx_damnificados_organismo ON damnificados(organismo_atiende_id);
CREATE INDEX IF NOT EXISTS idx_damnificados_alcaldia  ON damnificados(alcaldia_atiende_id);
CREATE INDEX IF NOT EXISTS idx_damnificados_tipo      ON damnificados(tipo_afectacion);

COMMIT;
