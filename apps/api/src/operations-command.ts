import { parseApiEnv } from "@nation-reserve/config";
import { operationsConfigSchema } from "@nation-reserve/operations";
import pg from "pg";

import { PostgresOperationsService } from "./postgres-operations-service.js";

const api = parseApiEnv(process.env);
const config = operationsConfigSchema.parse({
  ...process.env,
  OPERATIONS_ENVIRONMENT: api.NODE_ENV,
});
const pool = new pg.Pool({ connectionString: api.DATABASE_URL });

try {
  const command = process.argv[2];
  if (command !== "evaluate-alerts") {
    throw new Error("Usage: operations-command.ts evaluate-alerts");
  }
  const result = await new PostgresOperationsService(pool, config).evaluateAlertsForSystem();
  process.stdout.write(
    `${JSON.stringify({
      evaluated: result.evaluated,
      raised: result.raised.length,
      alertIds: result.raised.map((alert: { id: string }) => alert.id),
    })}\n`,
  );
} finally {
  await pool.end();
}
