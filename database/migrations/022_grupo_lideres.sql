-- 022: Líderes de grupo en comités, JAL; corrección FK configuracion

BEGIN;

-- Líder (FK a profiles) en comités
ALTER TABLE comites_gestion_riesgo ADD COLUMN IF NOT EXISTS lider_id UUID REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_comites_lider ON comites_gestion_riesgo(lider_id);

-- Responsable (FK a profiles) en JAL — campo adicional al 'presidente' texto libre existente
ALTER TABLE juntas_accion_comunal ADD COLUMN IF NOT EXISTS responsable_id UUID REFERENCES profiles(id);
CREATE INDEX IF NOT EXISTS idx_jal_responsable ON juntas_accion_comunal(responsable_id);

-- También vincular jal_id en profiles si no existe
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS jal_id UUID REFERENCES juntas_accion_comunal(id);
CREATE INDEX IF NOT EXISTS idx_profiles_jal ON profiles(jal_id);

-- Corregir FK configuracion.departamento_id: debe apuntar a departamentos, no a municipios
-- Primero eliminar constraint incorrecto si existe
DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT tc.constraint_name INTO v_constraint
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_name = 'configuracion'
    AND kcu.column_name = 'departamento_id'
    AND tc.constraint_type = 'FOREIGN KEY';
  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE configuracion DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

ALTER TABLE configuracion
  ADD CONSTRAINT fk_configuracion_departamento
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
  NOT VALID;

COMMIT;
