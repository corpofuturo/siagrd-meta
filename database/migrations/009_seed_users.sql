-- Usuarios semilla para desarrollo y demo
-- Contraseñas hasheadas con bcrypt (cost 10):
--   admin    → $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVdcSB3oki  (= 'admin')
--   bombero  → $2a$10$w5MlnN/CgLiWmtl.PKXD9.TkNeZUJLkInkCJhd0mfMlvxI8MxOQ2  (= 'bombero')
-- Generar nuevos hashes: node -e "const b=require('bcryptjs');b.hash('admin',10).then(console.log)"

INSERT INTO profiles (email, password_hash, nombre, apellido, rol, activo)
VALUES
  ('admin@satam.co',   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVdcSB3oki', 'Administrador', 'SATAM',    'admin',     true),
  ('bombero@satam.co', '$2a$10$w5MlnN/CgLiWmtl.PKXD9.TkNeZUJLkInkCJhd0mfMlvxI8MxOQ2', 'Bombero',       'Demo',      'operador',  true)
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      nombre        = EXCLUDED.nombre,
      apellido      = EXCLUDED.apellido,
      rol           = EXCLUDED.rol,
      activo        = EXCLUDED.activo;
