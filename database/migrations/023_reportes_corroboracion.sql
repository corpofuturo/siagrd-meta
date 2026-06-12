-- 023: Corroboración de reportes ciudadanos antes de convertir en evento

BEGIN;

-- Nuevo estado en enum estado_reporte
DO $$ BEGIN
  ALTER TYPE estado_reporte ADD VALUE IF NOT EXISTS 'CORROBORADO';
EXCEPTION WHEN undefined_object THEN
  -- El enum puede llamarse diferente o ser TEXT; crear si no existe
  CREATE TYPE estado_reporte AS ENUM ('PENDIENTE','REVISADO','CORROBORADO','VINCULADO','DESCARTADO');
END $$;

-- Tabla de corroboraciones (N organismos/alcaldías/comités corroboran un reporte)
CREATE TABLE IF NOT EXISTS corroboraciones_reporte (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporte_id      UUID NOT NULL REFERENCES reportes_ciudadanos(id) ON DELETE CASCADE,
  corroborado_por UUID NOT NULL REFERENCES profiles(id),
  tipo_grupo      TEXT NOT NULL CHECK (tipo_grupo IN ('ORGANISMO','COMITE','ALCALDIA','GOBERNACION','JAL')),
  grupo_id        UUID NOT NULL,
  confirmado      BOOLEAN NOT NULL DEFAULT TRUE,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corroboraciones_reporte ON corroboraciones_reporte(reporte_id);
CREATE INDEX IF NOT EXISTS idx_corroboraciones_autor   ON corroboraciones_reporte(corroborado_por);

-- Contador de corroboraciones en reportes_ciudadanos
ALTER TABLE reportes_ciudadanos ADD COLUMN IF NOT EXISTS corroboraciones_count INT NOT NULL DEFAULT 0;
ALTER TABLE reportes_ciudadanos ADD COLUMN IF NOT EXISTS corroboraciones_requeridas INT NOT NULL DEFAULT 1;

-- Limpiar residuo: cambiar default de fuente_reporte en incidentes de APP_SOCORRO a APK
DO $$ BEGIN
  ALTER TABLE incidentes ALTER COLUMN fuente_reporte SET DEFAULT 'APK';
EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- Endpoint PATCH /reportes-ciudadanos/:id ahora necesita este estado; el trigger actualiza el contador
CREATE OR REPLACE FUNCTION fn_actualizar_corroboraciones()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE reportes_ciudadanos
  SET corroboraciones_count = (
    SELECT COUNT(*) FROM corroboraciones_reporte
    WHERE reporte_id = NEW.reporte_id AND confirmado = TRUE
  )
  WHERE id = NEW.reporte_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_corroboraciones ON corroboraciones_reporte;
CREATE TRIGGER trg_corroboraciones
AFTER INSERT OR UPDATE ON corroboraciones_reporte
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_corroboraciones();

COMMIT;
