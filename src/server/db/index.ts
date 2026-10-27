import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

export function createDb(url: string, options: PoolConfig = {}): { db: Db; pool: Pool } {
  const pool = new Pool({ connectionString: url, ...options });
  return { db: drizzle({ client: pool, schema }), pool };
}

const globalForDb = globalThis as unknown as { appDb?: Db };

// One pool per process; survives Next dev hot reloads. On Vercel, DATABASE_URL
// is Neon's pooled URL; attachDatabasePool closes idle connections before a
// function suspends (a no-op elsewhere).
export function getDb(): Db {
  if (!globalForDb.appDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    const { db, pool } = createDb(url, { max: 5, idleTimeoutMillis: 5_000 });
    attachDatabasePool(pool);
    globalForDb.appDb = db;
  }
  return globalForDb.appDb;
}
