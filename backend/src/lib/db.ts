import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL ?? '';

const sslConfig =
  process.env.DATABASE_SSL === 'false'
    ? false
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false;

// Lazy singleton — no lanza en import si DATABASE_URL no está (tests pueden mockear)
export const db = connectionString
  ? postgres(connectionString, { ssl: sslConfig, max: 10, idle_timeout: 20, connect_timeout: 10 })
  : (null as unknown as ReturnType<typeof postgres>);
