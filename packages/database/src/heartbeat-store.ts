/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unnecessary-type-assertion, @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-unsafe-argument */
import type { HeartbeatMessage,HeartbeatRepository,HeartbeatUnitOfWork }
  from "@nation-reserve/heartbeat-domain";
import type { Pool,PoolClient } from "pg";

const one=async(client:PoolClient,sql:string,values:unknown[]=[]) =>
  (await client.query(sql,values)).rows[0] as any|undefined;

export class PostgresHeartbeatUnitOfWork implements HeartbeatUnitOfWork {
  constructor(private readonly pool:Pool){}
  async transaction<T>(work:(repo:HeartbeatRepository)=>Promise<T>){
    const client=await this.pool.connect();
    try{await client.query("BEGIN");const result=await work(new PostgresHeartbeatRepository(client));
      await client.query("COMMIT");return result;
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  }
}

export class PostgresHeartbeatRepository implements HeartbeatRepository {
  constructor(private readonly client:PoolClient){}
  async credentialForUpdate(prefix:string){
    return one(this.client,`SELECT id,credential_prefix prefix,robot_id "robotId",
      manufacturer_id "manufacturerId",credential_type type,encrypted_secret "encryptedSecret",
      public_key "publicKey",status,valid_from "validFrom",expires_at "expiresAt"
      FROM robot_production_credentials WHERE credential_prefix=$1 FOR UPDATE`,[prefix]);
  }
  async context(message:HeartbeatMessage){
    const r=await one(this.client,`SELECT r.id robot_id,r.manufacturer_id,r.manufacturer_serial_number,
      r.robot_model_id,r.firmware_version,r.activation_state,r.ownership_state,r.maintenance_state,
      r.compliance_state,r.final_lifecycle_state,ro.owner_organization_id,
      a.id assignment_id,a.robot_id assignment_robot_id,a.contract_id,a.contract_version_id,
      a.manufacturer_id assignment_manufacturer_id,a.hiring_company_id,a.facility_id,a.department_id,
      a.robot_owner_organization_id,a.status assignment_status,a.scheduled_start_at,a.scheduled_end_at,
      c.status contract_status,c.rate_configuration_version_id,
      rm.operational_state_mapping->>$2::text mapped_state,
      ($3::timestamptz>=a.scheduled_start_at AND $3::timestamptz<a.scheduled_end_at AND
       NOT EXISTS(SELECT 1 FROM contract_schedule_exceptions e WHERE e.contract_version_id=a.contract_version_id
         AND e.exception_date=($3 AT TIME ZONE f.timezone)::date AND e.exception_type IN ('holiday','blackout')) AND
       (NOT EXISTS(SELECT 1 FROM contract_schedule_rules sr WHERE sr.contract_version_id=a.contract_version_id) OR
        EXISTS(SELECT 1 FROM contract_schedule_rules sr WHERE sr.contract_version_id=a.contract_version_id
          AND sr.day_of_week=EXTRACT(DOW FROM ($3 AT TIME ZONE sr.timezone))
          AND ($3 AT TIME ZONE sr.timezone)::time>=sr.local_start_time
          AND ($3 AT TIME ZONE sr.timezone)::time<sr.local_end_time
          AND ($3 AT TIME ZONE sr.timezone)::date BETWEEN sr.recurrence_start AND
            COALESCE(sr.recurrence_end,'infinity'::date)))) within_schedule
      FROM robots r JOIN robot_assignments a ON a.id=$4 AND a.robot_id=r.id
      JOIN contracts c ON c.id=a.contract_id JOIN facilities f ON f.id=a.facility_id
      JOIN robot_models rm ON rm.id=r.robot_model_id
      LEFT JOIN robot_ownership_records ro ON ro.robot_id=r.id AND ro.ownership_status='verified'
        AND ro.ownership_end_at IS NULL WHERE r.id=$1`,[message.robotId,message.manufacturerState,
        message.sentAt,message.assignmentId]);
    if(!r)return undefined;
    return {robot:{id:r.robot_id,manufacturerId:r.manufacturer_id,serial:r.manufacturer_serial_number,
      modelId:r.robot_model_id,firmwareVersion:r.firmware_version,activationState:r.activation_state,
      ownershipState:r.ownership_state,maintenanceState:r.maintenance_state,
      complianceState:r.compliance_state,lifecycleState:r.final_lifecycle_state,
      ownerOrganizationId:r.owner_organization_id},
      assignment:{id:r.assignment_id,robotId:r.assignment_robot_id,contractId:r.contract_id,
        contractVersionId:r.contract_version_id,manufacturerId:r.assignment_manufacturer_id,
        hiringCompanyId:r.hiring_company_id,facilityId:r.facility_id,departmentId:r.department_id,
        ownerOrganizationId:r.robot_owner_organization_id,status:r.assignment_status,
        startAt:r.scheduled_start_at,endAt:r.scheduled_end_at},
      contract:{id:r.contract_id,status:r.contract_status,
        financialConfigurationVersionId:r.rate_configuration_version_id},
      mappedState:r.mapped_state??null,withinSchedule:r.within_schedule};
  }
  async replayStateForUpdate(robotId:string,credentialId:string){
    return one(this.client,`SELECT highest_sequence_number highest,
      lowest_acceptable_sequence_number lowest,last_message_id "lastMessageId"
      FROM robot_heartbeat_sequence_state WHERE robot_id=$1 AND credential_id=$2 FOR UPDATE`,
      [robotId,credentialId]);
  }
  async heartbeatByMessageOrNonce(credentialId:string,messageId:string,nonceHash:string){
    return one(this.client,`SELECT message_id "messageId",payload_hash "payloadHash"
      FROM robot_heartbeat_messages WHERE credential_id=$1 AND (message_id=$2 OR nonce_hash=$3)`,
      [credentialId,messageId,nonceHash]);
  }
  async insertHeartbeat(input:any){
    const m=input.message as HeartbeatMessage;const h=input.headers;
    return (await one(this.client,`INSERT INTO robot_heartbeat_messages(message_id,robot_id,
      manufacturer_id,assignment_id,contract_id,credential_id,schema_version,sequence_number,nonce_hash,
      sent_at,received_at,manufacturer_state,mapped_operational_state,network_status,firmware_version,
      api_version,signature_algorithm,signature_validation_result,identity_validation_result,
      assignment_correlation_result,schedule_correlation_result,lifecycle_eligibility_result,
      operating_time_decision,validation_status,payload_hash,source_ip,request_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'valid',$18,$19,$20,
      $21,$22,$23,$24,$25,$26) RETURNING id`,[m.messageId,m.robotId,input.manufacturerId,m.assignmentId,
      input.contractId,input.credentialId,m.schemaVersion,m.sequenceNumber,input.nonceHash,m.sentAt,
      input.receivedAt,m.manufacturerState,input.mappedState,m.networkStatus,m.firmwareVersion,m.apiVersion,
      h.algorithm,input.identityValid?"valid":"invalid",input.assignmentMatched?"matched":"not_matched",
      input.withinSchedule?"within_window":"outside_window",input.decision==="robot_not_eligible"?
        "ineligible":"eligible",input.decision,input.validationStatus,input.payloadHash,h.sourceIp??null,
      h.requestId]))!;
  }
  async updateReplayState(i:any){
    await this.client.query(`INSERT INTO robot_heartbeat_sequence_state(robot_id,credential_id,
      highest_sequence_number,lowest_acceptable_sequence_number,last_message_id,last_sent_at,last_received_at)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(robot_id,credential_id) DO UPDATE SET
      highest_sequence_number=EXCLUDED.highest_sequence_number,
      lowest_acceptable_sequence_number=EXCLUDED.lowest_acceptable_sequence_number,
      last_message_id=EXCLUDED.last_message_id,last_sent_at=EXCLUDED.last_sent_at,
      last_received_at=EXCLUDED.last_received_at,state_version=robot_heartbeat_sequence_state.state_version+1,
      updated_at=now()`,[i.robotId,i.credentialId,i.highest,i.lowest,i.messageId,i.sentAt,i.receivedAt]);
  }
  async updateProjection(i:any){
    await this.client.query(`INSERT INTO robot_heartbeat_status(robot_id,heartbeat_state,last_valid_message_id,
      last_valid_sent_at,last_valid_received_at,last_mapped_operational_state,last_assignment_id,
      next_expected_at,offline_after_at,current_credential_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT(robot_id) DO UPDATE SET heartbeat_state=EXCLUDED.heartbeat_state,
      last_valid_message_id=EXCLUDED.last_valid_message_id,last_valid_sent_at=EXCLUDED.last_valid_sent_at,
      last_valid_received_at=EXCLUDED.last_valid_received_at,
      last_mapped_operational_state=EXCLUDED.last_mapped_operational_state,
      last_assignment_id=EXCLUDED.last_assignment_id,next_expected_at=EXCLUDED.next_expected_at,
      offline_after_at=EXCLUDED.offline_after_at,current_credential_id=EXCLUDED.current_credential_id,
      consecutive_invalid_count=0,consecutive_missed_count=0,
      projection_version=robot_heartbeat_status.projection_version+1,updated_at=now()`,
      [i.robotId,i.heartbeatState,i.messageId,i.sentAt,i.receivedAt,i.mappedState,i.assignmentId,
        i.nextExpectedAt,i.offlineAfterAt,i.credentialId]);
    await this.client.query(`UPDATE robots SET heartbeat_state=$2,operational_state=$3,
      financial_eligibility_state=$4,state_version=state_version+1,updated_at=now() WHERE id=$1`,
      [i.robotId,i.heartbeatState,i.mappedState,i.mappedState==="operating"?"potentially_payable":"not_payable"]);
  }
  async applyEligibleHeartbeat(i:any){
    const c=i.context;const m=i.message as HeartbeatMessage;
    const open=await one(this.client,`SELECT * FROM verified_operating_intervals
      WHERE robot_id=$1 AND assignment_id=$2 AND status='open' FOR UPDATE`,[m.robotId,c.assignment.id]);
    if(!open){
      const created=await one(this.client,`INSERT INTO verified_operating_intervals(robot_id,
        robot_owner_organization_id,manufacturer_id,hiring_company_id,contract_id,contract_version_id,
        assignment_id,facility_id,department_id,financial_configuration_version_id,interval_start_at,
        verified_duration_seconds,status,source_method,evidence_start_message_id,calculation_version,review_status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,'open','heartbeat_continuity',$12,$13,'not_required')
        RETURNING id`,[m.robotId,c.assignment.ownerOrganizationId,c.assignment.manufacturerId,
        c.assignment.hiringCompanyId,c.contract.id,c.assignment.contractVersionId,c.assignment.id,
        c.assignment.facilityId,c.assignment.departmentId,c.contract.financialConfigurationVersionId,
        m.sentAt,m.messageId,i.calculationVersion]);
      return {verifiedSeconds:0,intervalId:created.id};
    }
    const last=await one(this.client,`SELECT sent_at FROM robot_heartbeat_messages WHERE message_id=$1
      ORDER BY received_at DESC LIMIT 1`,[open.evidence_end_message_id??open.evidence_start_message_id]);
    const gap=Math.max(0,Math.floor((m.sentAt.getTime()-new Date(last.sent_at).getTime())/1000));
    if(gap>i.maxExtensionSeconds){
      const cutoff=new Date(new Date(last.sent_at).getTime()+i.maxExtensionSeconds*1000);
      await this.client.query(`UPDATE verified_operating_intervals SET interval_end_at=$2,
        verified_duration_seconds=GREATEST(0,EXTRACT(EPOCH FROM ($2-interval_start_at))::integer),
        status='closed',updated_at=now() WHERE id=$1`,[open.id,cutoff]);
      const created=await one(this.client,`INSERT INTO verified_operating_intervals(robot_id,
        robot_owner_organization_id,manufacturer_id,hiring_company_id,contract_id,contract_version_id,
        assignment_id,facility_id,department_id,financial_configuration_version_id,interval_start_at,
        verified_duration_seconds,status,source_method,evidence_start_message_id,calculation_version,review_status)
        SELECT robot_id,robot_owner_organization_id,manufacturer_id,hiring_company_id,contract_id,
        contract_version_id,assignment_id,facility_id,department_id,financial_configuration_version_id,
        $2,0,'open','heartbeat_continuity',$3,calculation_version,'not_required'
        FROM verified_operating_intervals WHERE id=$1 RETURNING id`,[open.id,m.sentAt,m.messageId]);
      return {verifiedSeconds:i.maxExtensionSeconds,intervalId:created.id};
    }
    await this.client.query(`UPDATE verified_operating_intervals SET evidence_end_message_id=$2,
      verified_duration_seconds=LEAST(EXTRACT(EPOCH FROM ($3-interval_start_at))::integer,
        verified_duration_seconds+$4),updated_at=now() WHERE id=$1`,[open.id,m.messageId,m.sentAt,gap]);
    return {verifiedSeconds:gap,intervalId:open.id};
  }
  async closeOperatingInterval(i:any){
    await this.client.query(`UPDATE verified_operating_intervals SET interval_end_at=$2,status='closed',
      verified_duration_seconds=GREATEST(0,EXTRACT(EPOCH FROM ($2-interval_start_at))::integer),
      updated_at=now() WHERE assignment_id=$1 AND status='open' AND $2>interval_start_at`,
      [i.assignmentId,i.effectiveAt]);
  }
  async recordFraudSignal(i:any){
    await this.client.query(`INSERT INTO heartbeat_fraud_signals(robot_id,credential_id,assignment_id,
      signal_type,severity,score,message_id,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [i.robotId,i.credentialId,i.assignmentId??null,i.type,i.severity,i.severity==="high"?80:40,
        i.messageId??null,{}]);
  }
  async audit(action:string,type:string,id:string,metadata:object={}){
    await this.client.query(`INSERT INTO audit_logs(actor_type,action,entity_type,entity_id,metadata,
      resource_type,resource_id,source) VALUES('robot',$1,$2,$3,$4,$2,$3,'heartbeat')`,
      [action,type,id,metadata]);
  }
  async outbox(type:string,aggregateType:string,id:string,payload:object){
    await this.client.query(`INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,
      occurred_at,payload) VALUES(gen_random_uuid(),$1,$2,$3,now(),$4)`,[type,aggregateType,id,payload]);
  }
}
