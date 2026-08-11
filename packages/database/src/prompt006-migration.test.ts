import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe,expect,it } from "vitest";
describe("Prompt 006 migration",()=>{
  it("protects credentials, replay evidence, intervals, downtime, incidents, holds, and signals",async()=>{
    const sql=await readFile(resolve("migrations/0006_production_heartbeat_operating_time.sql"),"utf8");
    for(const table of ["robot_production_credentials","robot_heartbeat_messages",
      "robot_heartbeat_sequence_state","robot_heartbeat_status","verified_operating_intervals",
      "robot_downtime_intervals","robot_operational_incidents","operating_time_holds",
      "heartbeat_fraud_signals"])expect(sql).toContain(`CREATE TABLE ${table}`);
    expect(sql).toContain("UNIQUE(credential_id,message_id)");
    expect(sql).toContain("UNIQUE(credential_id,nonce_hash)");
    expect(sql).toContain("robot_heartbeat_messages_append_only");
    expect(sql).toContain("verified_intervals_no_overlap");
    expect(sql).toContain("finalized operating intervals are immutable");
  });
});
