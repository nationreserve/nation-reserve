import { createDatabaseClient } from "../client.js";
import { migrate } from "../migrations.js";
import { seedDevelopmentIdentities } from "../seed-development.js";
import { seedPrompt004Fixtures } from "../seed-prompt004.js";
import { seedPrompt006Fixtures } from "../seed-prompt006.js";
import { seedPrompt007Fixtures } from "../seed-prompt007.js";
import { seedPrompt008Fixtures } from "../seed-prompt008.js";
import { seedPrompt009Fixtures } from "../seed-prompt009.js";

const client = createDatabaseClient();
try {
  await migrate(client.pool);
  await client.pool.query("BEGIN");
  try {
    const organization = await client.pool.query<{ id: string }>(`
      INSERT INTO organizations (id, legal_name, display_name, organization_type, status)
      VALUES ('00000000-0000-4000-8000-000000000001', 'Nation Reserve, Inc.',
              'Nation Reserve', 'platform', 'active')
      ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
      RETURNING id
    `);
    await client.pool.query(`
      INSERT INTO financial_configuration_versions (
        id, version, currency, base_rate_minor_units_per_hour,
        owner_platform_fee_basis_points, company_platform_fee_basis_points,
        effective_at, status
      ) VALUES (
        '00000000-0000-4000-8000-000000000002', 1, 'USD', 500, 1500, 1500,
        '2026-01-01T00:00:00Z', 'active'
      )
      ON CONFLICT (version) DO NOTHING
    `);
    await client.pool.query(`
      INSERT INTO audit_logs (actor_type, action, entity_type, entity_id, metadata)
      VALUES ('system', 'development_seed_applied', 'organization', $1, $2::jsonb)
    `, [organization.rows[0]?.id, JSON.stringify({ seedVersion: 1 })]);
    await client.pool.query("COMMIT");
    console.info("Development seed applied (idempotent reference records).");
  } catch (error) {
    await client.pool.query("ROLLBACK");
    throw error;
  }
  await seedDevelopmentIdentities(client.pool);
  await seedPrompt004Fixtures(client.pool);
  await seedPrompt006Fixtures(client.pool);
  await seedPrompt007Fixtures(client.pool);
  await seedPrompt008Fixtures(client.pool);
  await seedPrompt009Fixtures(client.pool);
} finally {
  await client.close();
}

