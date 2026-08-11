import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "./migrations.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
let pool: Pool;

describeWithDatabase("PostgreSQL domain invariants", () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    await migrate(pool);
  });
  afterAll(async () => {
    await pool.end();
  });

  it("has initial versioned financial rules", async () => {
    const result = await pool.query(`
      SELECT base_rate_minor_units_per_hour, owner_platform_fee_basis_points,
             company_platform_fee_basis_points
      FROM financial_configuration_versions WHERE version = 1
    `);
    expect(result.rows[0]).toMatchObject({
      base_rate_minor_units_per_hour: 500,
      owner_platform_fee_basis_points: 1500,
      company_platform_fee_basis_points: 1500,
    });
  });

  it("rejects audit mutation", async () => {
    const inserted = await pool.query<{ id: number }>(`
      INSERT INTO audit_logs(actor_type, action, entity_type, metadata)
      VALUES ('system', 'integration_test', 'test', '{}') RETURNING id
    `);
    await expect(pool.query(
      "UPDATE audit_logs SET action = 'tampered' WHERE id = $1",
      [inserted.rows[0]?.id],
    )).rejects.toThrow();
  });
});

