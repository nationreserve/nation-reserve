import { createDatabaseClient } from "../client.js";
import { migrate } from "../migrations.js";

if (process.env.NODE_ENV === "production") {
  throw new Error("Database reset is disabled in production.");
}
if (process.env.ALLOW_DATABASE_RESET !== "true") {
  throw new Error("Set ALLOW_DATABASE_RESET=true to acknowledge destructive reset.");
}

const client = createDatabaseClient();
try {
  await client.pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  const applied = await migrate(client.pool);
  console.info(`Database reset; applied ${applied.length} migration(s).`);
} finally {
  await client.close();
}

