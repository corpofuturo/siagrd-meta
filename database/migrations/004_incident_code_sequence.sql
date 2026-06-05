-- Reemplazar generación de código de incidente con secuencia para evitar race condition
-- La función anterior usaba COUNT(*) + 1 que falla bajo carga concurrente

CREATE SEQUENCE IF NOT EXISTS incident_code_seq START 1;

CREATE OR REPLACE FUNCTION generate_incident_code()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  seq_num   TEXT;
BEGIN
  year_part := to_char(NOW(), 'YYYY');
  seq_num   := lpad(nextval('incident_code_seq')::TEXT, 5, '0');
  RETURN 'INC-' || year_part || '-' || seq_num;
END;
$$ LANGUAGE plpgsql;
