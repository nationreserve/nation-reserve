import { createDatabaseClient } from "../client.js";
import { migrate } from "../migrations.js";

const client = createDatabaseClient();
try {
  const applied = await migrate(client.pool);
  console.info(applied.length ? `Applied: ${applied.join(", ")}` : "Database is current.");
} finally {
  await client.close();
}

