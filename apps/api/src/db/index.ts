import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { existsSync } from 'fs';
import * as path from 'path';
import * as schema from './schema';

// Local development: load environment variables from .env or .env.local if not already set.
if (!process.env.DATABASE_URL) {
  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env.local'),
  ];
  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      try {
        process.loadEnvFile(envPath);
        if (process.env.DATABASE_URL) {
          break;
        }
      } catch {
        // ignore
      }
    }
  }
}

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
