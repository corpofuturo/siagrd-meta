-- Agrega columna emitida_at a alertas (timestamp cuando se emite/activa la alerta)
ALTER TABLE alertas ADD COLUMN IF NOT EXISTS emitida_at TIMESTAMPTZ;
