-- Migration: 005_rls_fixes.sql
-- Fixes de auditoría de seguridad RLS — hallazgos 6, 7, 9, 11

-- ============================================================
-- Hallazgo 6: recursos_organismo visible para cualquier usuario
-- autenticado. Solo CDGRD/ADMIN ven todos; CMGRD/SOCORRO ven
-- recursos de su municipio via organismo.
-- ============================================================
DROP POLICY IF EXISTS recursos_organismo_select ON recursos_organismo;
CREATE POLICY "recursos_select" ON recursos_organismo FOR SELECT USING (
  get_user_role() IN ('ADMIN', 'CDGRD') OR
  organismo_id IN (
    SELECT id FROM organismos
    WHERE municipio_id = get_user_municipio()
  )
);

-- ============================================================
-- Hallazgo 7: reportes_ciudadanos SELECT sin filtro de tenant.
-- ADMIN/CDGRD ven todos; CMGRD/SOCORRO ven su municipio;
-- ciudadanos autenticados solo ven sus propios reportes
-- no-anónimos.
-- ============================================================
DROP POLICY IF EXISTS reportes_ciudadanos_select ON reportes_ciudadanos;
CREATE POLICY "reportes_select" ON reportes_ciudadanos FOR SELECT USING (
  get_user_role() IN ('ADMIN', 'CDGRD') OR
  (get_user_role() IN ('CMGRD', 'SOCORRO') AND municipio_id = get_user_municipio()) OR
  (anonimo = false AND reportado_por = auth.uid())
);

-- ============================================================
-- Hallazgo 9: audit_log — garantizar que solo ADMIN puede leer;
-- INSERT/UPDATE/DELETE quedan exclusivos del service_role
-- (sin políticas RLS para esas operaciones en rol normal).
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_log' AND policyname = 'audit_log_select'
  ) THEN
    CREATE POLICY "audit_log_select" ON audit_log FOR SELECT USING (
      get_user_role() = 'ADMIN'
    );
  END IF;
END $$;

-- ============================================================
-- Hallazgo 11: incidentes_cercanos RPC sin filtro de tenant.
-- La función respeta el municipio del usuario (ADMIN/CDGRD ven
-- todos; resto solo su municipio).
-- ============================================================
CREATE OR REPLACE FUNCTION incidentes_cercanos(
  p_lat     NUMERIC,
  p_lng     NUMERIC,
  p_radio_km NUMERIC DEFAULT 10
)
RETURNS SETOF incidentes AS $$
DECLARE
  v_rol    rol_usuario;
  v_mun_id UUID;
BEGIN
  SELECT rol, municipio_id INTO v_rol, v_mun_id
  FROM profiles WHERE id = auth.uid();

  RETURN QUERY
  SELECT i.*
  FROM incidentes i
  WHERE ST_DWithin(
    i.ubicacion::geography,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_radio_km * 1000
  )
  AND i.estado != 'CERRADO'
  AND (
    v_rol IN ('ADMIN', 'CDGRD') OR
    i.municipio_id = v_mun_id
  )
  ORDER BY ST_Distance(
    i.ubicacion::geography,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
