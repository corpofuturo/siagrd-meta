-- Stub del schema auth de Supabase para entorno de desarrollo local.
-- En producción Supabase provee este schema automáticamente.
-- Este archivo se ejecuta PRIMERO (prefijo 000_) solo en dev local con Docker.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stub de auth.uid() para dev local — en Supabase es nativa
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::jsonb->>'sub',
    '00000000-0000-0000-0000-000000000000'
  )::UUID;
$$ LANGUAGE SQL STABLE;
