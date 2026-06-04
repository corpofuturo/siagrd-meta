ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE actualizaciones_incidente ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_ciudadanos ENABLE ROW LEVEL SECURITY;
ALTER TABLE damnificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE recursos_organismo ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role() RETURNS rol_usuario AS $$
  SELECT rol FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_municipio() RETURNS UUID AS $$
  SELECT municipio_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  id = auth.uid() OR get_user_role() IN ('ADMIN','CDGRD')
);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "incidentes_select" ON incidentes FOR SELECT USING (
  get_user_role() IN ('ADMIN','CDGRD') OR municipio_id = get_user_municipio()
);
CREATE POLICY "incidentes_insert" ON incidentes FOR INSERT WITH CHECK (
  get_user_role() IN ('CDGRD','CMGRD','SOCORRO')
);
CREATE POLICY "incidentes_update" ON incidentes FOR UPDATE USING (
  get_user_role() IN ('ADMIN','CDGRD') OR
  (get_user_role() IN ('CMGRD','SOCORRO') AND municipio_id = get_user_municipio())
);

CREATE POLICY "alertas_select_all" ON alertas FOR SELECT USING (true);
CREATE POLICY "alertas_insert_cdgrd" ON alertas FOR INSERT WITH CHECK (
  get_user_role() IN ('ADMIN','CDGRD')
);
CREATE POLICY "alertas_update_cdgrd" ON alertas FOR UPDATE USING (
  get_user_role() IN ('ADMIN','CDGRD')
);

CREATE POLICY "damnificados_select" ON damnificados FOR SELECT USING (
  get_user_role() IN ('ADMIN','CDGRD') OR
  (get_user_role() IN ('CMGRD','SOCORRO') AND municipio_id = get_user_municipio())
);
CREATE POLICY "damnificados_insert" ON damnificados FOR INSERT WITH CHECK (
  get_user_role() IN ('CDGRD','CMGRD','SOCORRO')
);

CREATE POLICY "recursos_select_all" ON recursos_organismo FOR SELECT USING (true);
CREATE POLICY "reportes_insert_any" ON reportes_ciudadanos FOR INSERT WITH CHECK (true);
CREATE POLICY "reportes_select" ON reportes_ciudadanos FOR SELECT USING (
  (anonimo = false AND reportado_por = auth.uid()) OR
  get_user_role() IN ('ADMIN','CDGRD') OR
  (get_user_role() IN ('CMGRD','SOCORRO') AND municipio_id = get_user_municipio())
);
