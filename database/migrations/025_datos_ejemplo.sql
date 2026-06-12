-- 025: Datos de ejemplo para el departamento del Meta
-- Municipios usados: Villavicencio, Acacías, Granada, San Martín, Restrepo
-- Departamento Meta: dbc4d692-c4b5-47f2-9edf-9747c6b4831d
-- Admin profile: 01507ec8-8207-41a8-9c58-0b74f2c09cf9

BEGIN;

-- Eliminar constraint CHECK de estado si aún es la versión antigua (sin CORROBORADO)
DO $$ BEGIN
  ALTER TABLE reportes_ciudadanos DROP CONSTRAINT IF EXISTS reportes_ciudadanos_estado_check;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────
-- 0. REGISTROS EN TABLA users (requerida por FK de profiles)
-- ─────────────────────────────────────────────────────────────────

INSERT INTO auth.users (id, email, created_at) VALUES
  ('a1000001-0000-0000-0000-000000000001', 'alcalde.villavicencio@meta.gov.co',   NOW()),
  ('a1000002-0000-0000-0000-000000000002', 'alcalde.acacias@meta.gov.co',         NOW()),
  ('a1000003-0000-0000-0000-000000000003', 'alcalde.granada@meta.gov.co',         NOW()),
  ('a1000004-0000-0000-0000-000000000004', 'alcalde.sanmartin@meta.gov.co',       NOW()),
  ('a1000005-0000-0000-0000-000000000005', 'alcalde.restrepo@meta.gov.co',        NOW()),
  ('a1000010-0000-0000-0000-000000000010', 'director.riesgos@meta.gov.co',        NOW()),
  ('a1000020-0000-0000-0000-000000000020', 'cdgrd@meta.gov.co',                   NOW()),
  ('a1000021-0000-0000-0000-000000000021', 'cmgrd.villavicencio@meta.gov.co',     NOW()),
  ('a1000022-0000-0000-0000-000000000022', 'cmgrd.acacias@meta.gov.co',           NOW()),
  ('a1000030-0000-0000-0000-000000000030', 'jal.barzal@villavicencio.gov.co',     NOW()),
  ('a1000031-0000-0000-0000-000000000031', 'jal.laesperanza@villavicencio.gov.co',NOW()),
  ('a1000032-0000-0000-0000-000000000032', 'jal.eldorado@acacias.gov.co',         NOW()),
  ('a1000050-0000-0000-0000-000000000050', 'ciudadano1@gmail.com',                NOW()),
  ('a1000051-0000-0000-0000-000000000051', 'ciudadano2@gmail.com',                NOW())
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 1. PERFILES DE EJEMPLO
-- ─────────────────────────────────────────────────────────────────

INSERT INTO profiles (id, email, nombre, apellido, documento, celular, rol, activo, created_at, updated_at)
VALUES
  ('a1000001-0000-0000-0000-000000000001', 'alcalde.villavicencio@meta.gov.co',   'Carlos',   'Rodríguez',  '12345001', '3101000001', 'ALCALDIA',    TRUE, NOW(), NOW()),
  ('a1000002-0000-0000-0000-000000000002', 'alcalde.acacias@meta.gov.co',         'María',    'González',   '12345002', '3101000002', 'ALCALDIA',    TRUE, NOW(), NOW()),
  ('a1000003-0000-0000-0000-000000000003', 'alcalde.granada@meta.gov.co',         'Jesús',    'Martínez',   '12345003', '3101000003', 'ALCALDIA',    TRUE, NOW(), NOW()),
  ('a1000004-0000-0000-0000-000000000004', 'alcalde.sanmartin@meta.gov.co',       'Ana',      'Pérez',      '12345004', '3101000004', 'ALCALDIA',    TRUE, NOW(), NOW()),
  ('a1000005-0000-0000-0000-000000000005', 'alcalde.restrepo@meta.gov.co',        'Luis',     'Torres',     '12345005', '3101000005', 'ALCALDIA',    TRUE, NOW(), NOW()),
  ('a1000010-0000-0000-0000-000000000010', 'director.riesgos@meta.gov.co',        'Roberto',  'Castillo',   '12345010', '3101000010', 'GOBERNACION', TRUE, NOW(), NOW()),
  ('a1000020-0000-0000-0000-000000000020', 'cdgrd@meta.gov.co',                   'Fernando', 'Vargas',     '12345020', '3101000020', 'CDGRD',       TRUE, NOW(), NOW()),
  ('a1000021-0000-0000-0000-000000000021', 'cmgrd.villavicencio@meta.gov.co',     'Patricia', 'Morales',    '12345021', '3101000021', 'CMGRD',       TRUE, NOW(), NOW()),
  ('a1000022-0000-0000-0000-000000000022', 'cmgrd.acacias@meta.gov.co',           'Andrés',   'Herrera',    '12345022', '3101000022', 'CMGRD',       TRUE, NOW(), NOW()),
  ('a1000030-0000-0000-0000-000000000030', 'jal.barzal@villavicencio.gov.co',     'Carmen',   'López',      '12345030', '3101000030', 'CIUDADANO',   TRUE, NOW(), NOW()),
  ('a1000031-0000-0000-0000-000000000031', 'jal.laesperanza@villavicencio.gov.co','Diego',    'Ramírez',    '12345031', '3101000031', 'CIUDADANO',   TRUE, NOW(), NOW()),
  ('a1000032-0000-0000-0000-000000000032', 'jal.eldorado@acacias.gov.co',         'Sandra',   'Jiménez',    '12345032', '3101000032', 'CIUDADANO',   TRUE, NOW(), NOW()),
  ('a1000050-0000-0000-0000-000000000050', 'ciudadano1@gmail.com',                'Pedro',    'García',     '12345050', '3101000050', 'CIUDADANO',   TRUE, NOW(), NOW()),
  ('a1000051-0000-0000-0000-000000000051', 'ciudadano2@gmail.com',                'Lucía',    'Mendoza',    '12345051', '3101000051', 'CIUDADANO',   TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 2. GOBERNACIÓN DEPARTAMENTAL
-- ─────────────────────────────────────────────────────────────────

INSERT INTO gobernacion_departamental (id, departamento_id, nombre, director, correo, telefono, direccion, lider_id, activo, created_at, updated_at)
VALUES (
  'b0000001-0000-0000-0000-000000000001',
  'dbc4d692-c4b5-47f2-9edf-9747c6b4831d',
  'Dirección de Gestión del Riesgo — Gobernación del Meta',
  'Roberto Castillo Vargas',
  'director.riesgos@meta.gov.co',
  '(8) 662-5000',
  'Calle 40 # 29-25, Villavicencio, Meta',
  'a1000010-0000-0000-0000-000000000010',
  TRUE, NOW(), NOW()
) ON CONFLICT (departamento_id) DO NOTHING;

UPDATE profiles SET gobernacion_id = 'b0000001-0000-0000-0000-000000000001'
WHERE id = 'a1000010-0000-0000-0000-000000000010';

-- ─────────────────────────────────────────────────────────────────
-- 3. ALCALDÍAS
-- ─────────────────────────────────────────────────────────────────

INSERT INTO alcaldias (id, municipio_id, nombre, alcalde, secretaria, correo, telefono, direccion, lider_id, activo, created_at, updated_at)
VALUES
  ('c0000001-0000-0000-0000-000000000001', '0cd91dde-a852-4ecf-ad83-faeabdb579ac',
   'Alcaldía de Villavicencio', 'Carlos Rodríguez Peña', 'Secretaría de Gobierno',
   'alcalde.villavicencio@meta.gov.co', '(8) 671-8000', 'Carrera 30 # 35-54, Villavicencio',
   'a1000001-0000-0000-0000-000000000001', TRUE, NOW(), NOW()),

  ('c0000002-0000-0000-0000-000000000002', '0337abf7-4b14-4e1d-81b9-d42572b3a2c3',
   'Alcaldía de Acacías', 'María González Lozano', 'Secretaría de Planeación',
   'alcalde.acacias@meta.gov.co', '(8) 664-3000', 'Calle 7 # 14-12, Acacías',
   'a1000002-0000-0000-0000-000000000002', TRUE, NOW(), NOW()),

  ('c0000003-0000-0000-0000-000000000003', '38314467-5e09-43a1-83ea-769d895075d2',
   'Alcaldía de Granada', 'Jesús Martínez Cifuentes', 'Secretaría de Infraestructura',
   'alcalde.granada@meta.gov.co', '(8) 673-2200', 'Carrera 11 # 10-20, Granada',
   'a1000003-0000-0000-0000-000000000003', TRUE, NOW(), NOW()),

  ('c0000004-0000-0000-0000-000000000004', 'cc6003de-5ae1-4d94-991f-fe20d63d63dd',
   'Alcaldía de San Martín de los Llanos', 'Ana Pérez Castellanos', 'Secretaría de Salud',
   'alcalde.sanmartin@meta.gov.co', '(8) 682-5100', 'Calle 15 # 12-30, San Martín',
   'a1000004-0000-0000-0000-000000000004', TRUE, NOW(), NOW()),

  ('c0000005-0000-0000-0000-000000000005', '84f4f8ed-7817-41b8-a1bd-0cdee65a7e02',
   'Alcaldía de Restrepo', 'Luis Torres Bernal', 'Secretaría de Ambiente',
   'alcalde.restrepo@meta.gov.co', '(8) 665-1200', 'Carrera 9 # 8-45, Restrepo',
   'a1000005-0000-0000-0000-000000000005', TRUE, NOW(), NOW())
ON CONFLICT (municipio_id) DO NOTHING;

UPDATE profiles SET alcaldia_id = 'c0000001-0000-0000-0000-000000000001' WHERE id = 'a1000001-0000-0000-0000-000000000001';
UPDATE profiles SET alcaldia_id = 'c0000002-0000-0000-0000-000000000002' WHERE id = 'a1000002-0000-0000-0000-000000000002';
UPDATE profiles SET alcaldia_id = 'c0000003-0000-0000-0000-000000000003' WHERE id = 'a1000003-0000-0000-0000-000000000003';
UPDATE profiles SET alcaldia_id = 'c0000004-0000-0000-0000-000000000004' WHERE id = 'a1000004-0000-0000-0000-000000000004';
UPDATE profiles SET alcaldia_id = 'c0000005-0000-0000-0000-000000000005' WHERE id = 'a1000005-0000-0000-0000-000000000005';

-- ─────────────────────────────────────────────────────────────────
-- 4. COMITÉS DE GESTIÓN DEL RIESGO
-- columnas: id, tipo, nombre, municipio_id, presidente, secretario, correo, telefono, direccion, activo, lider_id
-- ─────────────────────────────────────────────────────────────────

INSERT INTO comites_gestion_riesgo (id, tipo, nombre, municipio_id, presidente, secretario, correo, telefono, lider_id, activo, created_at, updated_at)
VALUES
  ('d0000001-0000-0000-0000-000000000001',
   'CDGRD',
   'Consejo Departamental de Gestión del Riesgo — Meta',
   NULL,
   'Fernando Vargas Nieto',
   'Secretario Técnico CDGRD',
   'cdgrd@meta.gov.co',
   '(8) 662-5100',
   'a1000020-0000-0000-0000-000000000020',
   TRUE, NOW(), NOW()),

  ('d0000002-0000-0000-0000-000000000002',
   'CMGRD',
   'Consejo Municipal de Gestión del Riesgo — Villavicencio',
   '0cd91dde-a852-4ecf-ad83-faeabdb579ac',
   'Patricia Morales Acosta',
   'Secretaria Técnica CMGRD',
   'cmgrd.villavicencio@meta.gov.co',
   '(8) 671-8100',
   'a1000021-0000-0000-0000-000000000021',
   TRUE, NOW(), NOW()),

  ('d0000003-0000-0000-0000-000000000003',
   'CMGRD',
   'Consejo Municipal de Gestión del Riesgo — Acacías',
   '0337abf7-4b14-4e1d-81b9-d42572b3a2c3',
   'Andrés Herrera Cárdenas',
   'Secretario Técnico CMGRD Acacías',
   'cmgrd.acacias@meta.gov.co',
   '(8) 664-3100',
   'a1000022-0000-0000-0000-000000000022',
   TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 5. JUNTAS DE ACCIÓN COMUNAL
-- columnas: id, nombre, barrio_vereda, municipio_id, presidente, correo, telefono, activo, responsable_id
-- ─────────────────────────────────────────────────────────────────

INSERT INTO juntas_accion_comunal (id, nombre, barrio_vereda, municipio_id, presidente, correo, telefono, responsable_id, activo, created_at, updated_at)
VALUES
  ('e0000001-0000-0000-0000-000000000001',
   'JAC Barrio El Barzal', 'El Barzal',
   '0cd91dde-a852-4ecf-ad83-faeabdb579ac',
   'Carmen López Rojas', 'jal.barzal@villavicencio.gov.co', '3102000001',
   'a1000030-0000-0000-0000-000000000030', TRUE, NOW(), NOW()),

  ('e0000002-0000-0000-0000-000000000002',
   'JAC Barrio La Esperanza', 'La Esperanza',
   '0cd91dde-a852-4ecf-ad83-faeabdb579ac',
   'Diego Ramírez Ortiz', 'jal.laesperanza@villavicencio.gov.co', '3102000002',
   'a1000031-0000-0000-0000-000000000031', TRUE, NOW(), NOW()),

  ('e0000003-0000-0000-0000-000000000003',
   'JAC Barrio El Dorado', 'El Dorado',
   '0337abf7-4b14-4e1d-81b9-d42572b3a2c3',
   'Sandra Jiménez Pinto', 'jal.eldorado@acacias.gov.co', '3102000003',
   'a1000032-0000-0000-0000-000000000032', TRUE, NOW(), NOW()),

  ('e0000004-0000-0000-0000-000000000004',
   'JAC Vereda Caño Maizaro', 'Vereda Caño Maizaro',
   '0cd91dde-a852-4ecf-ad83-faeabdb579ac',
   'Alberto Sánchez Cruz', 'jal.canomaizaro@villavicencio.gov.co', '3102000004',
   NULL, TRUE, NOW(), NOW()),

  ('e0000005-0000-0000-0000-000000000005',
   'JAC Barrio Barzal Alto', 'Barzal Alto',
   '0cd91dde-a852-4ecf-ad83-faeabdb579ac',
   'Gloria Ríos Medina', 'jal.barzalalto@villavicencio.gov.co', '3102000005',
   NULL, TRUE, NOW(), NOW()),

  ('e0000006-0000-0000-0000-000000000006',
   'JAC Barrio Siete de Agosto', 'Siete de Agosto',
   '38314467-5e09-43a1-83ea-769d895075d2',
   'Beatriz Mosquera Leal', 'jal.sieteagosto@granada.gov.co', '3102000006',
   NULL, TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 6. REPORTES CIUDADANOS DE EJEMPLO
-- ─────────────────────────────────────────────────────────────────

INSERT INTO reportes_ciudadanos (id, descripcion, tipo, municipio_id, ubicacion, anonimo, reportado_por, estado, created_at)
VALUES
  ('f0000001-0000-0000-0000-000000000001',
   'Se observa desbordamiento del caño en la carrera 30 con calle 40, el agua ya está llegando a las casas del barrio El Barzal',
   'INUNDACION', '0cd91dde-a852-4ecf-ad83-faeabdb579ac',
   ST_SetSRID(ST_MakePoint(-73.6266, 4.1420), 4326),
   FALSE, 'a1000050-0000-0000-0000-000000000050',
   'PENDIENTE', NOW() - INTERVAL '2 hours'),

  ('f0000002-0000-0000-0000-000000000002',
   'Deslizamiento de tierra en la vía que conduce a la vereda Caño Maizaro, varios vehículos bloqueados',
   'REMOCION', '0cd91dde-a852-4ecf-ad83-faeabdb579ac',
   ST_SetSRID(ST_MakePoint(-73.6100, 4.1650), 4326),
   FALSE, 'a1000051-0000-0000-0000-000000000051',
   'REVISADO', NOW() - INTERVAL '5 hours'),

  ('f0000003-0000-0000-0000-000000000003',
   'Incendio de cobertura vegetal cerca de la finca El Paraíso, viento fuerte está extendiendo las llamas hacia el sector sur',
   'INCENDIO_FORESTAL', '0337abf7-4b14-4e1d-81b9-d42572b3a2c3',
   ST_SetSRID(ST_MakePoint(-73.7540, 3.9880), 4326),
   TRUE, NULL,
   'PENDIENTE', NOW() - INTERVAL '1 hour'),

  ('f0000004-0000-0000-0000-000000000004',
   'Ruptura de tubería principal de acueducto en el barrio La Esperanza, hay bache grande en la vía pública',
   'OTRO', '0cd91dde-a852-4ecf-ad83-faeabdb579ac',
   ST_SetSRID(ST_MakePoint(-73.6300, 4.1390), 4326),
   FALSE, 'a1000050-0000-0000-0000-000000000050',
   'CORROBORADO', NOW() - INTERVAL '8 hours')
ON CONFLICT (id) DO NOTHING;

COMMIT;
