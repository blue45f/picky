import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL?.trim();
const isLocalhost = databaseUrl?.includes('localhost') || databaseUrl?.includes('127.0.0.1');

export const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
  max: 8,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });
