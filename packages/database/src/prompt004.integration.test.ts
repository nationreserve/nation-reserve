import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { migrate } from "./migrations.js";
import { seedDevelopmentIdentities } from "./seed-development.js";
import { seedPrompt004Fixtures } from "./seed-prompt004.js";

const url = process.env.TEST_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;
let pool: Pool;

describeWithDatabase("Prompt 004 PostgreSQL concurrency", () => {
  beforeAll(async () => {
    pool = new Pool({ connectionString: url, max: 10 });
    await migrate(pool);
    await seedDevelopmentIdentities(pool);
    await seedPrompt004Fixtures(pool);
  });
  afterAll(async () => pool.end());

  it("allows a transfer code to be consumed only once under concurrency", async () => {
    const id = randomUUID();
    const hash = randomUUID().replaceAll("-", "");
    await pool.query(`INSERT INTO robot_transfer_codes
      (id,robot_id,manufacturer_id,code_hash,status,expires_at,created_by_user_id)
      VALUES($1,'00000000-0000-4000-8000-000000000601',
      '00000000-0000-4000-8000-000000000303',$2,'active',now()+interval '1 hour',
      '00000000-0000-4000-8000-000000000104')`, [id, hash]);
    const consume = () => pool.query(`UPDATE robot_transfer_codes SET status='consumed',consumed_at=now()
      WHERE id=$1 AND status='active' RETURNING id`, [id]);
    const results = await Promise.all([consume(), consume()]);
    expect(results.reduce((sum, result) => sum + (result.rowCount ?? 0), 0)).toBe(1);
  });

  it("prevents duplicate active activation sessions", async () => {
    await expect(pool.query(`INSERT INTO robot_activation_sessions
      (robot_id,environment,status,request_id,started_by_credential_id,expires_at,
       expected_robot_state_version)
      VALUES('00000000-0000-4000-8000-000000000602','production','in_progress',$1,
      '00000000-0000-4000-8000-000000000402',now()+interval '1 hour',2)`,
    [randomUUID()])).rejects.toThrow();
  });

  it("prevents activation nonce replay", async () => {
    const nonce = randomUUID();
    const insert = (requestId: string) => pool.query(`INSERT INTO activation_test_messages
      (activation_session_id,request_id,nonce,manufacturer_state,mapped_platform_state,
       message_timestamp,result)
      VALUES('00000000-0000-4000-8000-000000000901',$1,$2,'IDLE','available',now(),'accepted')`,
    [requestId, nonce]);
    await insert(randomUUID());
    await expect(insert(randomUUID())).rejects.toThrow();
  });
});

