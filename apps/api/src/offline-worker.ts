/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { parseApiEnv } from "@nation-reserve/config";
import { heartbeatConfigSchema } from "@nation-reserve/heartbeat-domain";
import pg from "pg";
import { PostgresWorkerInstrumentation } from "./operations-instrumentation.js";

const api=parseApiEnv(process.env);
heartbeatConfigSchema.parse(process.env);
const pool=new pg.Pool({connectionString:api.DATABASE_URL});

export async function detectOfflineRobots(now=new Date()){
  const client=await pool.connect();let transitioned=0;
  try{await client.query("BEGIN");
    const {rows}=await client.query(`SELECT s.robot_id,s.last_assignment_id,s.next_expected_at,
      s.offline_after_at,a.contract_id,a.facility_id,a.department_id,a.hiring_company_id,
      a.manufacturer_id,a.robot_owner_organization_id
      FROM robot_heartbeat_status s JOIN robot_assignments a ON a.id=s.last_assignment_id
      WHERE a.status IN ('ready','scheduled','active','interrupted')
        AND $1>=s.next_expected_at AND $1<a.scheduled_end_at FOR UPDATE OF s SKIP LOCKED`,[now]);
    for(const row of rows){
      const offline=now>=row.offline_after_at;const state=offline?"offline":"degraded";
      await client.query(`UPDATE robot_heartbeat_status SET heartbeat_state=$2,
        consecutive_missed_count=consecutive_missed_count+1,projection_version=projection_version+1,
        updated_at=$3 WHERE robot_id=$1`,[row.robot_id,state,now]);
      if(!offline)continue;
      await client.query(`UPDATE robots SET heartbeat_state='offline',operational_state='unavailable',
        financial_eligibility_state='not_payable',state_version=state_version+1,updated_at=$2 WHERE id=$1`,
        [row.robot_id,now]);
      await client.query(`UPDATE verified_operating_intervals SET interval_end_at=
        interval_start_at+(verified_duration_seconds||' seconds')::interval,status='closed',updated_at=$2
        WHERE robot_id=$1 AND assignment_id=$3 AND status='open'`,[row.robot_id,now,row.last_assignment_id]);
      const incident=await client.query(`INSERT INTO robot_operational_incidents(robot_id,assignment_id,
        contract_id,hiring_company_id,manufacturer_id,owner_organization_id,facility_id,department_id,
        incident_type,source,severity,status,detected_at,summary)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,'robot_offline','automatic','high','open',$9,
          'Scheduled robot heartbeat is offline')
        ON CONFLICT(robot_id,assignment_id,incident_type) WHERE source='automatic'
          AND status IN ('open','acknowledged','under_review') DO NOTHING RETURNING id`,
        [row.robot_id,row.last_assignment_id,row.contract_id,row.hiring_company_id,row.manufacturer_id,
          row.robot_owner_organization_id,row.facility_id,row.department_id,now]);
      if(incident.rows[0])await client.query(`INSERT INTO robot_downtime_intervals(robot_id,assignment_id,
        contract_id,facility_id,department_id,downtime_start_at,downtime_type,detected_by,status,
        reason_code,source_incident_id) VALUES($1,$2,$3,$4,$5,$6,'heartbeat_missing','offline_worker',
        'open','offline_threshold',$7) ON CONFLICT DO NOTHING`,[row.robot_id,row.last_assignment_id,
        row.contract_id,row.facility_id,row.department_id,row.offline_after_at,incident.rows[0].id]);
      transitioned++;
    }
    await client.query("COMMIT");return transitioned;
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
if(import.meta.url===`file://${process.argv[1]}`){
const instrumentation=new PostgresWorkerInstrumentation(pool,{workerName:"heartbeat-worker",queueName:"heartbeats"});
  try{
    const count=await instrumentation.run("heartbeat-processing",{operation:"offline-detection"},()=>detectOfflineRobots(),transitioned=>({transitioned}));
    process.stdout.write(`Offline transitions: ${count}\n`);
  }finally{await pool.end();}
}
