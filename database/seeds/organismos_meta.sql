-- Seeds: organismos de socorro del departamento del Meta
-- Requiere que la tabla municipios esté poblada (seeds/municipios_meta.sql)

INSERT INTO organismos (nombre, tipo, municipio_id, telefono, activo)
SELECT o.nombre, o.tipo, m.id, o.telefono, true
FROM (VALUES
  ('Cuerpo de Bomberos Voluntarios Villavicencio', 'BOMBEROS',    'Villavicencio', '(608) 6620201'),
  ('Defensa Civil Seccional Meta',                 'DEFENSA_CIVIL','Villavicencio', '(608) 6624545'),
  ('Cruz Roja Colombiana Seccional Meta',          'CRUZ_ROJA',   'Villavicencio', '(608) 6622611'),
  ('Cuerpo de Bomberos Acacías',                   'BOMBEROS',    'Acacías',       '(608) 6466060'),
  ('Defensa Civil Granada',                        'DEFENSA_CIVIL','Granada',       '123'),
  ('Bomberos Voluntarios Granada',                 'BOMBEROS',    'Granada',       '(608) 6763333'),
  ('Cuerpo de Bomberos San Martín',                'BOMBEROS',    'San Martín',    '(608) 6756060'),
  ('Defensa Civil Puerto López',                   'DEFENSA_CIVIL','Puerto López',  '123'),
  ('Bomberos Puerto Gaitán',                       'BOMBEROS',    'Puerto Gaitán', '(608) 6265959'),
  ('Defensa Civil Puerto Gaitán',                  'DEFENSA_CIVIL','Puerto Gaitán', '123')
) AS o(nombre, tipo, mun_nombre, telefono)
JOIN municipios m ON m.nombre = o.mun_nombre
ON CONFLICT DO NOTHING;
