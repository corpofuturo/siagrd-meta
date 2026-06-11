import postgres from 'postgres';
const sql = postgres('postgresql://siagrd:siagrd2026@viaduct.proxy.rlwy.net:56926/siagrd', { ssl: 'require', max: 1 });
try {
  // Check existing columns
  const cols = await sql.unsafe(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'organismos'
  `);
  console.log('organismos cols:', cols.map(c => c.column_name).join(', '));

  await sql.unsafe(`
    DO $$ BEGIN
      CREATE TYPE tipo_organismo AS ENUM ('BOMBEROS','CRUZ_ROJA','DEFENSA_CIVIL','POLICIA','EJERCITO','SALUD','OTRO');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE organismos ADD COLUMN IF NOT EXISTS tipo tipo_organismo NOT NULL DEFAULT 'OTRO';
    ALTER TABLE organismos ADD COLUMN IF NOT EXISTS funciones TEXT;
    ALTER TABLE organismos ADD COLUMN IF NOT EXISTS ubicacion TEXT;
    ALTER TABLE organismos ADD COLUMN IF NOT EXISTS municipio_id UUID REFERENCES municipios(id);
    ALTER TABLE organismos ADD COLUMN IF NOT EXISTS correo TEXT;
    ALTER TABLE organismos ADD COLUMN IF NOT EXISTS celular TEXT;
    ALTER TABLE organismos ADD COLUMN IF NOT EXISTS director_id UUID REFERENCES profiles(id);
    ALTER TABLE organismos ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
    ALTER TABLE organismos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    CREATE INDEX IF NOT EXISTS idx_organismos_municipio ON organismos(municipio_id);
    CREATE INDEX IF NOT EXISTS idx_organismos_director  ON organismos(director_id);

    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organismo_id UUID REFERENCES organismos(id);
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS documento TEXT;
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS celular TEXT;

    CREATE INDEX IF NOT EXISTS idx_profiles_organismo ON profiles(organismo_id);
  `);
  console.log('OK — migración 018b completada');
} catch(e) {
  console.error('ERROR:', e.message);
} finally {
  await sql.end();
}
