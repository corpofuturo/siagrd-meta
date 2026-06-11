-- Migración 020: correcciones de seguridad SQA
-- DB-002: índice GIST en incidentes.ubicacion para consultas geoespaciales eficientes
CREATE INDEX IF NOT EXISTS idx_incidentes_ubicacion
  ON incidentes USING GIST (ubicacion);

-- DB-001: proteger audit_log contra DELETE por usuarios normales
-- Solo el rol de servicio (el backend conecta con el usuario de la cadena de conexión)
-- Habilitamos RLS y negamos DELETE a todos excepto al propietario del schema
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'audit_log_select'
  ) THEN
    CREATE POLICY audit_log_select ON audit_log FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'audit_log_insert'
  ) THEN
    CREATE POLICY audit_log_insert ON audit_log FOR INSERT WITH CHECK (true);
  END IF;
  -- No se crea policy para DELETE/UPDATE → ningún rol puede hacerlo vía RLS
END$$;

-- SEC-006: tabla para refresh tokens revocados (blacklist)
CREATE TABLE IF NOT EXISTS revoked_refresh_tokens (
  token_hash  TEXT        PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revoked_refresh_tokens_expires_at
  ON revoked_refresh_tokens (expires_at);

-- DB-003 (parcial): limpiar tokens expirados automáticamente con pg_cron si está disponible
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-revoked-tokens',
      '0 3 * * *',  -- cada día a las 3am
      'DELETE FROM revoked_refresh_tokens WHERE expires_at < NOW()'
    );
  END IF;
END$$;
