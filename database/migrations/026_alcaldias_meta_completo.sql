-- 026: Las 24 alcaldías restantes del Meta (ya existen Villavicencio, Acacías, Granada, San Martín, Restrepo)

BEGIN;

INSERT INTO alcaldias (municipio_id, nombre, activo, created_at, updated_at)
VALUES
  ('1c442173-697e-4e4e-8f40-62ce1b9fd853', 'Alcaldía de Barranca de Upía',   TRUE, NOW(), NOW()),
  ('6f2044a9-8d87-42e5-bdb6-dfce5572f557', 'Alcaldía de Cabuyaro',           TRUE, NOW(), NOW()),
  ('a5f09ee5-35e9-4bef-8279-30f6dc426f1a', 'Alcaldía de Castilla la Nueva',  TRUE, NOW(), NOW()),
  ('53e607df-4e64-4fb4-b735-84d178186818', 'Alcaldía de Cubarral',           TRUE, NOW(), NOW()),
  ('17f946ae-dad0-4b75-a4d0-e7dc5f3a983e', 'Alcaldía de Cumaral',            TRUE, NOW(), NOW()),
  ('fac94206-f256-4283-b6e1-51ab6221dfc7', 'Alcaldía de El Calvario',        TRUE, NOW(), NOW()),
  ('a04be888-9650-42be-bc21-179db86d0703', 'Alcaldía de El Castillo',        TRUE, NOW(), NOW()),
  ('e79bbbe5-16cc-463f-b40b-1efd39cc1cb5', 'Alcaldía de El Dorado',          TRUE, NOW(), NOW()),
  ('97636158-ffa1-491a-8f54-e5466125de46', 'Alcaldía de Fuente de Oro',      TRUE, NOW(), NOW()),
  ('dab3b0cf-6fda-4a4f-b99a-3a561a0e760b', 'Alcaldía de Guamal',             TRUE, NOW(), NOW()),
  ('f9c387e2-58df-427f-8f21-6bd3ad882e5c', 'Alcaldía de La Macarena',        TRUE, NOW(), NOW()),
  ('36408bb8-8c80-4d77-beef-ae64b5cf9880', 'Alcaldía de Lejanías',           TRUE, NOW(), NOW()),
  ('cc71b150-fe0c-4c9d-929c-f92fdb9bd1c8', 'Alcaldía de Mapiripán',          TRUE, NOW(), NOW()),
  ('1a385ffa-6c14-4d59-a961-f11b412b5548', 'Alcaldía de Mesetas',            TRUE, NOW(), NOW()),
  ('ddc98ec8-d239-436c-aebc-19d14dd3c470', 'Alcaldía de Puerto Concordia',   TRUE, NOW(), NOW()),
  ('a536290d-8bb2-4d67-929b-cff55c7a2052', 'Alcaldía de Puerto Gaitán',      TRUE, NOW(), NOW()),
  ('3c9a61cc-5610-4303-b95d-afa180dfe4d0', 'Alcaldía de Puerto Lleras',      TRUE, NOW(), NOW()),
  ('a9380e53-6c32-483a-8221-20b8b4619515', 'Alcaldía de Puerto López',       TRUE, NOW(), NOW()),
  ('f35304d7-c19c-459f-a64d-55bf09d26229', 'Alcaldía de Puerto Rico',        TRUE, NOW(), NOW()),
  ('56abb0db-c53e-4ee6-aaed-6f00e63cb47e', 'Alcaldía de San Carlos de Guaroa', TRUE, NOW(), NOW()),
  ('14788a0f-af6a-4507-98e5-4be0d922dd3e', 'Alcaldía de San Juan de Arama',  TRUE, NOW(), NOW()),
  ('ac73699d-eb5c-45b0-9ae0-a36bc9b43e3c', 'Alcaldía de San Juanito',        TRUE, NOW(), NOW()),
  ('d43b286c-b24c-468d-8b19-2b919616e061', 'Alcaldía de Uribe',              TRUE, NOW(), NOW()),
  ('b5a0dc06-18a3-41ae-b246-6b27cb8059fe', 'Alcaldía de Vistahermosa',       TRUE, NOW(), NOW())
ON CONFLICT (municipio_id) DO NOTHING;

COMMIT;
