-- Script de validación de RLS para ejecutar en Supabase SQL Editor
-- Verifica que un usuario CMGRD de Villavicencio NO ve incidentes de Acacias

-- PASO 1: Crear usuario de prueba CMGRD con municipio Villavicencio
-- (ejecutar manualmente como superuser en Supabase)
-- INSERT INTO auth.users (id, email) VALUES ('11111111-1111-1111-1111-111111111111', 'cmgrd_test@siagrd.test');
-- INSERT INTO profiles (id, nombre, apellido, rol, municipio_id)
--   SELECT '11111111-1111-1111-1111-111111111111', 'Test', 'CMGRD', 'CMGRD', id
--   FROM municipios WHERE codigo_dane = '50001';

-- PASO 2: Crear incidente en Acacias
-- INSERT INTO incidentes (titulo, tipo_amenaza, nivel_alerta, ubicacion, municipio_id, codigo)
--   SELECT 'Incidente test Acacias', 'INUNDACION', 'AMARILLO',
--     ST_SetSRID(ST_MakePoint(-73.7634, -3.9886), 4326), id, 'INC-TEST-001'
--   FROM municipios WHERE codigo_dane = '50006';

-- PASO 3: Verificar aislamiento (como usuario CMGRD Villavicencio)
-- SET request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';
-- SELECT COUNT(*) FROM incidentes WHERE municipio_id = (SELECT id FROM municipios WHERE codigo_dane = '50006');
-- RESULTADO ESPERADO: 0 (RLS bloquea acceso a otro municipio)

-- PASO 4: Verificar que sí ve incidentes de Villavicencio
-- SELECT COUNT(*) FROM incidentes WHERE municipio_id = (SELECT id FROM municipios WHERE codigo_dane = '50001');
-- RESULTADO ESPERADO: > 0 (si hay incidentes creados en Villavicencio)
