-- Indice GiST para busqueda geoespacial en incidentes (endpoint /cerca)
CREATE INDEX IF NOT EXISTS idx_incidentes_ubicacion_gist
  ON incidentes USING GIST (ubicacion::geography);

-- Indice parcial: solo incidentes activos
CREATE INDEX IF NOT EXISTS idx_incidentes_activos_ubicacion
  ON incidentes USING GIST (ubicacion::geography)
  WHERE estado NOT IN ('CERRADO', 'FALSA_ALARMA');

-- Indices para analytics time-series
CREATE INDEX IF NOT EXISTS idx_incidentes_created_at ON incidentes (created_at);
CREATE INDEX IF NOT EXISTS idx_alertas_created_at ON alertas (created_at);
CREATE INDEX IF NOT EXISTS idx_reportes_created_at ON reportes_ciudadanos (created_at);
CREATE INDEX IF NOT EXISTS idx_damnificados_created_at ON damnificados (created_at);
