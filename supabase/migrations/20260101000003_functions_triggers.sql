CREATE OR REPLACE FUNCTION generate_incident_code() RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INT;
BEGIN
  year_part := EXTRACT(YEAR FROM NOW())::TEXT;
  SELECT COUNT(*) + 1 INTO seq_num FROM incidentes
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
  NEW.codigo := 'INC-' || year_part || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incident_code
  BEFORE INSERT ON incidentes
  FOR EACH ROW
  WHEN (NEW.codigo IS NULL OR NEW.codigo = '')
  EXECUTE FUNCTION generate_incident_code();

CREATE OR REPLACE FUNCTION audit_trigger_fn() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (tabla, operacion, registro_id, datos_anteriores)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, row_to_json(OLD)::jsonb);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (tabla, operacion, registro_id, datos_anteriores, datos_nuevos)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (tabla, operacion, registro_id, datos_nuevos)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, row_to_json(NEW)::jsonb);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_incidentes AFTER INSERT OR UPDATE OR DELETE ON incidentes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_alertas AFTER INSERT OR UPDATE ON alertas
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
CREATE TRIGGER audit_damnificados AFTER INSERT OR UPDATE ON damnificados
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_incidentes_updated_at BEFORE UPDATE ON incidentes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_damnificados_updated_at BEFORE UPDATE ON damnificados
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para consultar incidentes cercanos por distancia
CREATE OR REPLACE FUNCTION incidentes_cercanos(
  punto_lat FLOAT, punto_lng FLOAT, radio_metros FLOAT
) RETURNS SETOF incidentes AS $$
  SELECT * FROM incidentes
  WHERE ST_DWithin(
    ubicacion::geography,
    ST_SetSRID(ST_MakePoint(punto_lng, punto_lat), 4326)::geography,
    radio_metros
  )
  AND estado IN ('ABIERTO', 'EN_ATENCION')
  ORDER BY ubicacion <-> ST_SetSRID(ST_MakePoint(punto_lng, punto_lat), 4326);
$$ LANGUAGE SQL STABLE;
