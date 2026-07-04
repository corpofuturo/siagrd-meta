-- Agrega columna foto_url a reportes_ciudadanos.
-- Bug SQA dispositivo físico (2026-07-04): el cliente móvil envía foto_url
-- al reportar un incidente pero la tabla no tenía dónde persistirlo.
-- Columna nullable, aditiva, no rompe filas existentes.
ALTER TABLE reportes_ciudadanos ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- La ruta PATCH /reportes-ciudadanos/:id (backend/src/routes/reportes.ts) ya
-- escribía SET updated_at = NOW() pero la columna nunca existió en el
-- esquema original (001_initial_schema.sql solo define created_at) — todo
-- PATCH fallaba con "column updated_at does not exist". Se agrega aquí.
ALTER TABLE reportes_ciudadanos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

