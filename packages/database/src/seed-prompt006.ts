import { encryptSecret } from "@nation-reserve/heartbeat-domain";
import type { Pool } from "pg";

export const developmentHeartbeatSecret="RWP-PROMPT006-DEVELOPMENT-ONLY-SECRET";
export async function seedPrompt006Fixtures(pool:Pool){
  if(process.env.NODE_ENV==="production")throw new Error("Prompt 006 fixtures are development-only.");
  const encrypted=encryptSecret(developmentHeartbeatSecret,
    process.env.ROBOT_HEARTBEAT_HMAC_ENCRYPTION_KEY??"development-only-heartbeat-encryption-key-000001");
  const client=await pool.connect();try{await client.query("BEGIN");
    await client.query(`INSERT INTO facilities(id,hiring_company_id,name,address_line_1,city,country_code,timezone,status)
      VALUES('00000000-0000-4000-8000-000000000304','00000000-0000-4000-8000-000000000302',
      'Development Facility','1 Test Way','Pittsburgh','US','America/New_York','active')
      ON CONFLICT(id) DO NOTHING`);
    await client.query(`INSERT INTO robot_hardware_identities(id,robot_id,environment,identity_type,
      identity_hash,display_identifier,status) VALUES
      ('00000000-0000-4000-8000-000000000309','00000000-0000-4000-8000-000000000603',
      'production','secure_element','development-hardware-603','DEV-HW-603','active')
      ON CONFLICT(id) DO NOTHING`);
    await client.query(`INSERT INTO contracts(id,manufacturer_id,hiring_company_id,facility_id,
      contract_type,requested_robot_count,priority,start_at,end_at,renewal_mode,status,current_version_number,
      rate_configuration_version_id,hiring_company_approved_at,manufacturer_approved_at,created_by_user_id)
      VALUES('00000000-0000-4000-8000-000000000306','00000000-0000-4000-8000-000000000303',
      '00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000304',
      'fixed_term',1,'normal',now()-interval '1 day',now()+interval '30 days','none','approved',1,
      '00000000-0000-4000-8000-000000000002',now(),now(),'00000000-0000-4000-8000-000000000103')
      ON CONFLICT(id) DO NOTHING`);
    await client.query(`INSERT INTO contract_versions(id,contract_id,version_number,requested_robot_count,
      operating_windows,required_capabilities,location_requirements,special_terms,effective_at,
      created_by_user_id,status,start_at,end_at,manufacturer_approved_at,company_approved_at)
      VALUES('00000000-0000-4000-8000-000000000307','00000000-0000-4000-8000-000000000306',
      1,1,'{}','{}','{}','{}',now()-interval '1 day','00000000-0000-4000-8000-000000000103',
      'approved',now()-interval '1 day',now()+interval '30 days',now(),now()) ON CONFLICT(id) DO NOTHING`);
    await client.query(`INSERT INTO robot_assignments(id,contract_id,contract_version_id,robot_id,
      robot_owner_organization_id,manufacturer_id,hiring_company_id,facility_id,status,
      scheduled_start_at,scheduled_end_at,financial_status)
      VALUES('00000000-0000-4000-8000-000000000308','00000000-0000-4000-8000-000000000306',
      '00000000-0000-4000-8000-000000000307','00000000-0000-4000-8000-000000000603',
      '00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000303',
      '00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000304',
      'scheduled',now()-interval '1 hour',now()+interval '7 days','not_eligible') ON CONFLICT(id) DO NOTHING`);
    await client.query(`INSERT INTO robot_production_credentials(id,robot_id,manufacturer_id,
      hardware_identity_id,credential_type,credential_prefix,encrypted_secret,status,valid_from,
      created_by_user_id) VALUES('00000000-0000-4000-8000-000000000310',
      '00000000-0000-4000-8000-000000000603','00000000-0000-4000-8000-000000000303',
      '00000000-0000-4000-8000-000000000309','hmac_secret','rwp_robot_dev_603',$1,'active',
      now()-interval '1 day','00000000-0000-4000-8000-000000000104') ON CONFLICT(id) DO NOTHING`,[encrypted]);
    await client.query(`INSERT INTO robot_heartbeat_status(robot_id,heartbeat_state,last_valid_received_at,
      last_mapped_operational_state,last_assignment_id,next_expected_at,offline_after_at,current_credential_id)
      VALUES
      ('00000000-0000-4000-8000-000000000603','online',now(),'operating',
       '00000000-0000-4000-8000-000000000308',now()+interval '30 seconds',now()+interval '90 seconds',
       '00000000-0000-4000-8000-000000000310'),
      ('00000000-0000-4000-8000-000000000602','degraded',now()-interval '45 seconds','available',NULL,now()-interval '15 seconds',now()+interval '45 seconds',NULL),
      ('00000000-0000-4000-8000-000000000601','offline',now()-interval '5 minutes','unavailable',NULL,now()-interval '4 minutes',now()-interval '3 minutes',NULL)
      ON CONFLICT(robot_id) DO NOTHING`);
    await client.query(`INSERT INTO robot_operational_incidents(id,robot_id,assignment_id,contract_id,
      hiring_company_id,manufacturer_id,owner_organization_id,facility_id,incident_type,source,severity,
      status,detected_at,reported_at,summary)
      VALUES('00000000-0000-4000-8000-000000000311','00000000-0000-4000-8000-000000000603',
      '00000000-0000-4000-8000-000000000308','00000000-0000-4000-8000-000000000306',
      '00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000303',
      '00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000304',
      'company_reported_inactive','hiring_company','medium','under_review',now()-interval '30 minutes',
      now()-interval '30 minutes','Development inactivity report') ON CONFLICT(id) DO NOTHING`);
    await client.query(`INSERT INTO heartbeat_fraud_signals(id,robot_id,credential_id,assignment_id,
      signal_type,severity,score,incident_id,evidence) VALUES('00000000-0000-4000-8000-000000000312',
      '00000000-0000-4000-8000-000000000603','00000000-0000-4000-8000-000000000310',
      '00000000-0000-4000-8000-000000000308','replay_attempt','high',80,
      '00000000-0000-4000-8000-000000000311','{"developmentFixture":true}') ON CONFLICT(id) DO NOTHING`);
    await client.query(`INSERT INTO robot_heartbeat_messages(id,message_id,robot_id,manufacturer_id,
      assignment_id,contract_id,credential_id,schema_version,sequence_number,nonce_hash,sent_at,received_at,
      manufacturer_state,mapped_operational_state,network_status,firmware_version,api_version,
      signature_algorithm,signature_validation_result,identity_validation_result,assignment_correlation_result,
      schedule_correlation_result,lifecycle_eligibility_result,operating_time_decision,validation_status,
      payload_hash,request_id) VALUES('00000000-0000-4000-8000-000000000313',
      '00000000-0000-4000-8000-000000000314','00000000-0000-4000-8000-000000000603',
      '00000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000308',
      '00000000-0000-4000-8000-000000000306','00000000-0000-4000-8000-000000000310',1,1,
      'development-nonce-hash',now()-interval '30 seconds',now()-interval '29 seconds','WORKING',
      'operating','connected','1.0.0','v1','hmac-sha-256','valid','valid','matched','within_window',
      'eligible','eligible','accepted','development-payload-hash','00000000-0000-4000-8000-000000000315')
      ON CONFLICT(id) DO NOTHING`);
    await client.query(`INSERT INTO verified_operating_intervals(id,robot_id,robot_owner_organization_id,
      manufacturer_id,hiring_company_id,contract_id,contract_version_id,assignment_id,facility_id,
      financial_configuration_version_id,interval_start_at,interval_end_at,verified_duration_seconds,status,
      source_method,evidence_start_message_id,evidence_end_message_id,calculation_version,review_status)
      VALUES('00000000-0000-4000-8000-000000000316','00000000-0000-4000-8000-000000000603',
      '00000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000303',
      '00000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000306',
      '00000000-0000-4000-8000-000000000307','00000000-0000-4000-8000-000000000308',
      '00000000-0000-4000-8000-000000000304','00000000-0000-4000-8000-000000000002',
      now()-interval '20 minutes',now()-interval '10 minutes',600,'held','heartbeat_continuity',
      '00000000-0000-4000-8000-000000000314','00000000-0000-4000-8000-000000000314',1,'pending')
      ON CONFLICT(id) DO NOTHING`);
    await client.query(`INSERT INTO robot_downtime_intervals(id,robot_id,assignment_id,contract_id,
      facility_id,downtime_start_at,downtime_end_at,duration_seconds,downtime_type,detected_by,status,
      reason_code,source_incident_id) VALUES('00000000-0000-4000-8000-000000000317',
      '00000000-0000-4000-8000-000000000603','00000000-0000-4000-8000-000000000308',
      '00000000-0000-4000-8000-000000000306','00000000-0000-4000-8000-000000000304',
      now()-interval '10 minutes',now()-interval '5 minutes',300,'company_reported_inactive',
      'development_seed','under_review','company_report','00000000-0000-4000-8000-000000000311')
      ON CONFLICT(id) DO NOTHING`);
    await client.query(`INSERT INTO operating_time_holds(id,robot_id,assignment_id,contract_id,interval_id,
      incident_id,hold_type,status,reason,placed_by_system,placed_at) VALUES
      ('00000000-0000-4000-8000-000000000318','00000000-0000-4000-8000-000000000603',
      '00000000-0000-4000-8000-000000000308','00000000-0000-4000-8000-000000000306',
      '00000000-0000-4000-8000-000000000316','00000000-0000-4000-8000-000000000311',
      'company_inactivity_report','active','Development evidence review',true,now())
      ON CONFLICT(id) DO NOTHING`);    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
}
