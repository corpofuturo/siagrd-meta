/**
 * Script de un solo uso para crear el primer usuario admin.
 * Uso: npx tsx scripts/create-admin.ts
 */
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

const db = postgres(process.env.DATABASE_URL!, {
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const email = process.argv[2] ?? 'gerente@corpofuturo.org';
const password = process.argv[3] ?? 'SiAgRd2026!';
const nombre = 'John Jairo';
const apellido = 'Velasquez';

const hash = await bcrypt.hash(password, 12);
const id = randomUUID();

await db`
  INSERT INTO profiles (id, email, password_hash, nombre, apellido, rol, activo)
  VALUES (${id}, ${email}, ${hash}, ${nombre}, ${apellido}, 'ADMIN', true)
  ON CONFLICT (email) DO UPDATE
    SET password_hash = ${hash}, rol = 'ADMIN', activo = true
`;

console.log(`✅ Usuario admin creado: ${email} / ${password}`);
await db.end();
