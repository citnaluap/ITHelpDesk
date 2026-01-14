import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
const sql = connectionString ? neon(connectionString) : null;

export const getSql = () => {
  if (!sql) {
    throw new Error('DATABASE_URL is not set');
  }
  return sql;
};

export const ensureTables = async () => {
  const db = getSql();
  await db`
    CREATE TABLE IF NOT EXISTS tickets (
      id text PRIMARY KEY,
      data jsonb NOT NULL
    );
  `;
  await db`
    CREATE TABLE IF NOT EXISTS approvals (
      id text PRIMARY KEY,
      data jsonb NOT NULL
    );
  `;
};
