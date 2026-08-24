import { hashIntegrationSecret, parseIntegrationEnvironment } from "@nation-reserve/robot-integration";
import type { Pool } from "pg";

export const developmentTransferCode = "RWP-DEVELOPMENT-TRANSFER-CODE-ONLY";

export async function seedPrompt004Fixtures(pool: Pool) {
  if (process.env.NODE_ENV === "production") throw new Error("Prompt 004 fixtures are development-only.");
  const config = parseIntegrationEnvironment({ ...process.env, NODE_ENV: "development" });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      INSERT INTO robot_models (
        id,manufacturer_id,model_name,model_code,model_version,description,robot_category,
        approval_status,capabilities,supported_api_versions,operational_state_mapping
      ) VALUES
      ('00000000-0000-4000-8000-000000000501','00000000-0000-4000-8000-000000000303',
       'Development Sandbox Robot','DEV-SBX','1.0','Development-only sandbox model','warehouse',
       'sandbox_approved','{"mobility":true}','["v1"]','{"WORKING":"operating","IDLE":"available"}'),
      ('00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000303',
       'Development Production Robot','DEV-PROD','1.0','Development-only production model','warehouse',
       'production_approved','{"mobility":true}','["v1"]','{"WORKING":"operating","IDLE":"available"}')
      ON CONFLICT(id) DO NOTHING
    `);
    await client.query(`
      INSERT INTO robot_model_revisions (
        id,robot_model_id,revision_number,model_version,capabilities,supported_api_versions,
        operational_state_mapping,status,created_by_user_id,submitted_at,reviewed_at
      ) VALUES
      ('00000000-0000-4000-8000-000000000511','00000000-0000-4000-8000-000000000501',
       1,'1.0','{"mobility":true}','["v1"]','{"WORKING":"operating","IDLE":"available"}',
       'sandbox_approved','00000000-0000-4000-8000-000000000104',now(),now()),
      ('00000000-0000-4000-8000-000000000512','00000000-0000-4000-8000-000000000502',
       1,'1.0','{"mobility":true}','["v1"]','{"WORKING":"operating","IDLE":"available"}',
       'production_approved','00000000-0000-4000-8000-000000000104',now(),now())
      ON CONFLICT(id) DO NOTHING
    `);
    await client.query(`
      INSERT INTO robots (
        id,manufacturer_id,robot_model_id,robot_model_revision_id,manufacturer_serial_number,
        normalized_serial_number,firmware_version,region_code,environment,registration_state,
        ownership_state,activation_state,heartbeat_state,operational_state,maintenance_state,
        compliance_state,financial_eligibility_state,final_lifecycle_state,state_version,
        hardware_identity_status,activated_at
      ) VALUES
      ('00000000-0000-4000-8000-000000000601','00000000-0000-4000-8000-000000000303',
       '00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000512',
       'DEV-UNOWNED-001','DEVUNOWNED001','1.0.0','US','production','registered','unassigned',
       'not_eligible','never_connected','unavailable','no_maintenance','eligible','not_payable',
       'active',1,'confirmed',NULL),
      ('00000000-0000-4000-8000-000000000602','00000000-0000-4000-8000-000000000303',
       '00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000512',
       'DEV-OWNED-001','DEVOWNED001','1.0.0','US','production','registered','ownership_verified',
       'activation_in_progress','never_connected','unavailable','no_maintenance','eligible','not_payable',
       'active',2,'confirmed',NULL),
      ('00000000-0000-4000-8000-000000000603','00000000-0000-4000-8000-000000000303',
       '00000000-0000-4000-8000-000000000502','00000000-0000-4000-8000-000000000512',
       'DEV-ACTIVE-001','DEVACTIVE001','1.0.0','US','production','registered','ownership_verified',
       'activated','never_connected','available','no_maintenance','eligible','not_payable',
       'active',3,'confirmed',now())
      ON CONFLICT(id) DO NOTHING
    `);
    await client.query(`
      INSERT INTO robot_ownership_records (
        id,robot_id,owner_organization_id,ownership_status,ownership_start_at,
        acquisition_method,verification_method,approved_by_user_id
      ) VALUES
      ('00000000-0000-4000-8000-000000000701','00000000-0000-4000-8000-000000000602',
       '00000000-0000-4000-8000-000000000201','verified',now(),'development_seed',
       'development_seed','00000000-0000-4000-8000-000000000101'),
      ('00000000-0000-4000-8000-000000000702','00000000-0000-4000-8000-000000000603',
       '00000000-0000-4000-8000-000000000201','verified',now(),'development_seed',
       'development_seed','00000000-0000-4000-8000-000000000101')
      ON CONFLICT(id) DO NOTHING
    `);
    await client.query(`
      INSERT INTO robot_transfer_codes (
        id,robot_id,manufacturer_id,code_hash,status,expires_at,created_by_user_id
      ) VALUES (
        '00000000-0000-4000-8000-000000000801','00000000-0000-4000-8000-000000000601',
        '00000000-0000-4000-8000-000000000303',$1,'active',now()+interval '10 years',
        '00000000-0000-4000-8000-000000000104'
      ) ON CONFLICT(id) DO NOTHING
    `, [hashIntegrationSecret(developmentTransferCode, config.apiKeyPepper)]);
    await client.query(`
      INSERT INTO robot_activation_sessions (
        id,robot_id,environment,status,request_id,started_by_credential_id,started_at,
        expires_at,expected_robot_state_version
      ) VALUES (
        '00000000-0000-4000-8000-000000000901','00000000-0000-4000-8000-000000000602',
        'production','in_progress','00000000-0000-4000-8000-000000000902',
        '00000000-0000-4000-8000-000000000402',now(),now()+interval '10 years',2
      ) ON CONFLICT(id) DO NOTHING
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

