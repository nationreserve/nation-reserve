import { Pool } from "pg";

import type { ManagedDependency } from "./types.js";

export function createPostgresDependency(databaseUrl: string): ManagedDependency & { pool: Pool } {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 2_000,
  });

  return {
    pool,
    async connect() {
      await pool.query("SELECT 1");
    },
    async check() {
      try {
        await pool.query("SELECT 1");
        return "up";
      } catch {
        return "down";
      }
    },
    async close() {
      await pool.end();
    },
  };
}


