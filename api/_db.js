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
  await db`
    CREATE TABLE IF NOT EXISTS tasks (
      id text PRIMARY KEY,
      data jsonb NOT NULL
    );
  `;
  await db`
    CREATE TABLE IF NOT EXISTS automation_rules (
      id text PRIMARY KEY,
      data jsonb NOT NULL
    );
  `;
  await db`
    CREATE TABLE IF NOT EXISTS canned_responses (
      id text PRIMARY KEY,
      data jsonb NOT NULL
    );
  `;
  await db`
    CREATE TABLE IF NOT EXISTS projects (
      id text PRIMARY KEY,
      data jsonb NOT NULL
    );
  `;
  await db`
    CREATE TABLE IF NOT EXISTS change_events (
      id text PRIMARY KEY,
      data jsonb NOT NULL
    );
  `;
  await db`
    CREATE TABLE IF NOT EXISTS problems (
      id text PRIMARY KEY,
      data jsonb NOT NULL
    );
  `;
  await db`
    CREATE TABLE IF NOT EXISTS releases (
      id text PRIMARY KEY,
      data jsonb NOT NULL
    );
  `;
  await db`
    CREATE TABLE IF NOT EXISTS service_catalog (
      id text PRIMARY KEY,
      data jsonb NOT NULL
    );
  `;
};
