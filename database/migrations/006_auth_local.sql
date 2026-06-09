-- Agrega autenticación local (sin Supabase Auth)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Índice para login por email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Eliminar referencia a auth.users si existe (ya no usamos Supabase Auth)
-- NOTA: ejecutar solo si la FK existe
-- ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
-- ALTER TABLE profiles ALTER COLUMN id SET DEFAULT uuid_generate_v4();
