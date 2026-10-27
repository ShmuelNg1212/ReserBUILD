import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = NodePgDatabase<typeof schema>;

export function createDb(url: string): { db: Db; pool: Pool } {
  const pool = new Pool({ connectionString: url });
  return { db: drizzle({ client: pool, schema }), pool };
}

const globalForDb = globalThis as unknown as { appDb?: Db };

// One pool per process; survives Next dev hot reloads.
export function getDb(): Db {
  if (!globalForDb.appDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    globalForDb.appDb = createDb(url).db;
  }
  return globalForDb.appDb;
}
