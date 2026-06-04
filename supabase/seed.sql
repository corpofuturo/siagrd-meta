INSERT INTO departamentos (nombre, codigo_dane) VALUES ('Meta', '50')
ON CONFLICT (codigo_dane) DO NOTHING;

INSERT INTO municipios (nombre, codigo_dane, departamento_id, centroide,
  nivel_riesgo_inundacion, nivel_riesgo_remocion, nivel_riesgo_sismico, poblacion)
SELECT m.nombre, m.dane, d.id,
  ST_SetSRID(ST_MakePoint(m.lng, m.lat), 4326),
  m.inun, m.remo, m.sism, m.pob
FROM (VALUES
  ('Villavicencio',       '50001', -73.6365, -4.1420, 2, 3, 2, 507260),
  ('Acacias',             '50006', -73.7634, -3.9886, 2, 3, 2,  77215),
  ('Barranca de Upia',    '50110', -72.9667, -4.5833, 3, 1, 2,  12000),
  ('Cabuyaro',            '50124', -72.7833, -4.2833, 3, 1, 1,   7500),
  ('Castilla la Nueva',   '50150', -73.6742, -3.7942, 2, 2, 2,  17000),
  ('El Calvario',         '50223', -73.7000, -4.3500, 1, 4, 2,   4500),
  ('El Castillo',         '50226', -73.9333, -3.7667, 2, 3, 1,   8000),
  ('El Dorado',           '50245', -73.7000, -3.6667, 2, 3, 1,   6000),
  ('Fuente de Oro',       '50270', -73.6000, -3.4667, 3, 1, 1,  12000),
  ('Granada',             '50313', -73.7000, -3.5333, 3, 2, 1,  62000),
  ('Guamal',              '50318', -73.7667, -3.8833, 2, 3, 2,  19000),
  ('Maripiran',           '50325', -73.0000, -2.8833, 4, 1, 1,  17000),
  ('Mesetas',             '50330', -74.0500, -3.3833, 2, 4, 1,  15000),
  ('La Macarena',         '50350', -73.7833, -2.1833, 3, 3, 1,  27000),
  ('Lejanias',            '50400', -74.0167, -3.5167, 2, 4, 1,  16000),
  ('Puerto Concordia',    '50450', -72.7500, -2.6167, 4, 1, 1,  13000),
  ('Puerto Gaitan',       '50568', -72.0833, -4.3167, 3, 1, 1,  23000),
  ('Puerto Lleras',       '50577', -73.3833, -3.2667, 3, 1, 1,  13000),
  ('Puerto Lopez',        '50573', -72.9667, -4.0833, 3, 1, 1,  33000),
  ('Puerto Rico',         '50590', -73.6833, -3.6833, 3, 2, 1,  23000),
  ('Restrepo',            '50606', -73.5667, -4.2500, 2, 3, 2,  17000),
  ('San Carlos de Guaroa','50680', -73.2667, -3.7167, 3, 1, 1,   9000),
  ('San Juan de Arama',   '50683', -73.8833, -3.3667, 2, 3, 1,   9000),
  ('San Juanito',         '50686', -73.6833, -4.4667, 1, 4, 3,   3000),
  ('San Martin',          '50689', -73.6833, -3.6833, 2, 2, 1,  24000),
  ('Uribe',               '50370', -74.3833, -3.2167, 2, 4, 1,  18000),
  ('Vistahermosa',        '50711', -73.7667, -3.1167, 2, 3, 1,  24000)
) AS m(nombre, dane, lng, lat, inun, remo, sism, pob)
CROSS JOIN departamentos d WHERE d.codigo_dane = '50'
ON CONFLICT (codigo_dane) DO NOTHING;

INSERT INTO organismos (nombre, tipo, municipio_id, telefono)
SELECT o.nombre, o.tipo, m.id, o.tel
FROM (VALUES
  ('Cuerpo de Bomberos Voluntarios de Villavicencio', 'BOMBEROS',    '50001', '6086620291'),
  ('Defensa Civil Colombiana Villavicencio',           'DEFENSA_CIVIL','50001', '6086624680'),
  ('Cruz Roja Colombiana Seccional Meta',              'CRUZ_ROJA',   '50001', '6086624680'),
  ('Cuerpo de Bomberos Voluntarios de Granada',        'BOMBEROS',    '50313', NULL),
  ('Defensa Civil Colombiana Granada',                 'DEFENSA_CIVIL','50313', NULL)
) AS o(nombre, tipo, municipio_dane, tel)
JOIN municipios m ON m.codigo_dane = o.municipio_dane
ON CONFLICT DO NOTHING;
