import { hashPassword, parseAuthEnvironment } from "@nation-reserve/auth";
import {
  hashIntegrationSecret,
  parseIntegrationEnvironment,
} from "@nation-reserve/robot-integration";
import type { Pool } from "pg";

const developmentPassword = "RoboWorkPool-Dev-Only-2026!";
const sandboxCredential =
  "rwp_sbx_111111111111_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const productionCredential =
  "rwp_prod_222222222222_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const transferCode = "RWP-DEVELOPMENT-TRANSFER-CODE-ONLY";

export async function seedDevelopmentIdentities(pool: Pool) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Development identities cannot be seeded in production.");
  const auth = parseAuthEnvironment({ ...process.env, NODE_ENV: "development" });
  const integration = parseIntegrationEnvironment({
    ...process.env,
    NODE_ENV: "development",
  });
  const passwordHash = await hashPassword(developmentPassword, auth);
  await pool.query("BEGIN");
  try {
    const identities = [
      [
        "00000000-0000-4000-8000-000000000101",
        "platform.admin@roboworkpool.test",
        "Platform Administrator",
        "00000000-0000-4000-8000-000000000001",
        "platform_admin",
      ],
      [
        "00000000-0000-4000-8000-000000000102",
        "owner@roboworkpool.test",
        "Development Robot Owner",
        "00000000-0000-4000-8000-000000000201",
        "owner",
      ],
      [
        "00000000-0000-4000-8000-000000000103",
        "company.admin@roboworkpool.test",
        "Hiring Company Administrator",
        "00000000-0000-4000-8000-000000000202",
        "administrator",
      ],
      [
        "00000000-0000-4000-8000-000000000104",
        "manufacturer.admin@roboworkpool.test",
        "Manufacturer Administrator",
        "00000000-0000-4000-8000-000000000203",
        "administrator",
      ],
    ] as const;
    await pool.query(`INSERT INTO organizations(id,legal_name,display_name,organization_type,status) VALUES
      ('00000000-0000-4000-8000-000000000001','Nation Reserve, Inc.','Nation Reserve','platform','active'),
      ('00000000-0000-4000-8000-000000000201','Development Robot Owner','Development Robot Owner','robot_owner','active'),
      ('00000000-0000-4000-8000-000000000202','Development Hiring Company','Development Hiring Company','hiring_company','active'),
      ('00000000-0000-4000-8000-000000000203','Development Robotics Manufacturer','Development Robotics','manufacturer','active')
      ON CONFLICT(id) DO NOTHING`);
    for (const [id, email, name, organizationId, role] of identities) {
      await pool.query(
        `INSERT INTO users(id,email,email_normalized,display_name,status,email_verified_at)
        VALUES($1,$2,$2,$3,'active',now()) ON CONFLICT(id) DO NOTHING`,
        [id, email, name],
      );
      await pool.query(
        `INSERT INTO user_credentials(user_id,password_hash,password_algorithm)
        VALUES($1,$2,'argon2id') ON CONFLICT(user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash`,
        [id, passwordHash],
      );
      await pool.query(
        `INSERT INTO organization_memberships(organization_id,user_id,role,status)
        VALUES($1,$2,$3,'active') ON CONFLICT DO NOTHING`,
        [organizationId, id, role],
      );
    }
    await pool.query(`INSERT INTO hiring_companies(id,organization_id,verification_status,billing_status)
      VALUES('00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000202',
      'verified','not_configured') ON CONFLICT(id) DO NOTHING`);
    await pool.query(`INSERT INTO manufacturers(id,organization_id,approval_status,production_access_status,
      sandbox_approved_at,production_approved_at,integration_status)
      VALUES('00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000203',
      'production_approved','production',now(),now(),'production_enabled') ON CONFLICT(id) DO NOTHING`);
    await pool.query(
      `INSERT INTO manufacturer_api_credentials(id,manufacturer_id,environment,credential_name,
      credential_prefix,secret_hash,status,scopes,allowed_api_versions,created_by_user_id,expires_at) VALUES
      ('00000000-0000-4000-8000-000000000401','00000000-0000-4000-8000-000000000303','sandbox',
      'Development sandbox','rwp_sbx_111111111111',$1,'active',
      '["manufacturer.robots.register","manufacturer.robots.read","manufacturer.activation.create",
      "manufacturer.activation.test","manufacturer.activation.complete"]','["v1"]',
      '00000000-0000-4000-8000-000000000104',now()+interval '10 years'),
      ('00000000-0000-4000-8000-000000000402','00000000-0000-4000-8000-000000000303','production',
      'Development production','rwp_prod_222222222222',$2,'active',
      '["manufacturer.robots.register","manufacturer.robots.read","manufacturer.activation.create",
      "manufacturer.activation.test","manufacturer.activation.complete"]','["v1"]',
      '00000000-0000-4000-8000-000000000104',now()+interval '10 years')
      ON CONFLICT(id) DO NOTHING`,
      [
        hashIntegrationSecret(sandboxCredential, integration.apiKeyPepper),
        hashIntegrationSecret(productionCredential, integration.apiKeyPepper),
      ],
    );
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
  return { developmentPassword, sandboxCredential, productionCredential, transferCode };
}
