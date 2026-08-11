import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "./schema.js";

export type Database = NodePgDatabase<typeof schema>;

export interface DatabaseClient {
  db: Database;
  pool: Pool;
  close(): Promise<void>;
}

export function createDatabaseClient(
  connection: string | PoolConfig = requireDatabaseUrl(),
): DatabaseClient {
  const pool = new Pool(
    typeof connection === "string" ? { connectionString: connection } : connection,
  );
  return {
    db: drizzle(pool, { schema }),
    pool,
    close: async () => {
      await pool.end();
    },
  };
}

export function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required.");
  return value;
}

