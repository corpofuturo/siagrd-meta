-- Usuarios semilla para demo
-- admin / admin   → rol: admin
-- bombero / bombero → rol: operador
INSERT INTO profiles (email, password_hash, nombre, apellido, rol, activo)
VALUES
  ('admin@satam.co',   '$2a$10$e5cmIFiV3tNqzjoDfqxGruOcbABV7rtMfzlX8N4LO9Cv7ujIyq5Pq', 'Administrador', 'SATAM', 'admin',    true),
  ('bombero@satam.co', '$2a$10$../BhUnSXYzDvjA/Vwdt8ORWEqedWvRJ0jKjZTvUYIef1/euB5ZVy', 'Bombero',       'Demo',  'operador', true)
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      rol           = EXCLUDED.rol,
      activo        = EXCLUDED.activo;
