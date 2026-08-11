import { canonicalHeartbeat, decryptSecret, sha256, verifyEd25519, verifyHmac }
  from "./crypto.js";
import type { HeartbeatConfig } from "./config.js";
import type { HeartbeatMessage } from "./schemas.js";

export interface ProductionCredential {
  id:string; prefix:string; robotId:string; manufacturerId:string;
  type:"hmac_secret"|"public_key_signature"|"device_certificate";
  encryptedSecret:string|null; publicKey:string|null; status:string;
  validFrom:Date; expiresAt:Date|null;
}
export interface HeartbeatContext {
  robot:{id:string;manufacturerId:string;serial:string;modelId:string;firmwareVersion:string|null;
    activationState:string;ownershipState:string;maintenanceState:string;complianceState:string;
    lifecycleState:string;ownerOrganizationId:string|null};
  assignment:{id:string;robotId:string;contractId:string;contractVersionId:string;
    manufacturerId:string;hiringCompanyId:string;facilityId:string;departmentId:string|null;
    ownerOrganizationId:string;status:string;startAt:Date;endAt:Date};
  contract:{id:string;status:string;financialConfigurationVersionId:string};
  mappedState:string|null;
  withinSchedule:boolean;
}
export interface HeartbeatRepository {
  credentialForUpdate(prefix:string):Promise<ProductionCredential|undefined>;
  context(message:HeartbeatMessage):Promise<HeartbeatContext|undefined>;
  replayStateForUpdate(robotId:string,credentialId:string):Promise<{
    highest:number;lowest:number;lastMessageId:string|null}|undefined>;
  heartbeatByMessageOrNonce(credentialId:string,messageId:string,nonceHash:string):
    Promise<{messageId:string;payloadHash:string}|undefined>;
  insertHeartbeat(input:Record<string,unknown>):Promise<{id:string}>;
  updateReplayState(input:Record<string,unknown>):Promise<void>;
  updateProjection(input:Record<string,unknown>):Promise<void>;
  applyEligibleHeartbeat(input:Record<string,unknown>):Promise<{verifiedSeconds:number;intervalId:string}>;
  closeOperatingInterval(input:Record<string,unknown>):Promise<void>;
  recordFraudSignal(input:Record<string,unknown>):Promise<void>;
  audit(action:string,type:string,id:string,metadata?:object):Promise<void>;
  outbox(type:string,aggregateType:string,id:string,payload:object):Promise<void>;
}
export interface HeartbeatUnitOfWork {
  transaction<T>(work:(repo:HeartbeatRepository)=>Promise<T>):Promise<T>;
}
export interface HeartbeatHeaders {
  credentialPrefix:string; signature:string; algorithm:"hmac-sha-256"|"ed25519";
  requestId:string; sourceIp?:string;
}
export class HeartbeatService {
  constructor(private readonly uow:HeartbeatUnitOfWork,private readonly config:HeartbeatConfig,
    private readonly now=()=>new Date()){}
  async ingest(message:HeartbeatMessage,headers:HeartbeatHeaders){
    return this.uow.transaction(async(repo)=>{
      const receivedAt=this.now();
      const credential=await repo.credentialForUpdate(headers.credentialPrefix);
      if(!credential||credential.status!=="active"||credential.validFrom>receivedAt||
        (credential.expiresAt&&credential.expiresAt<=receivedAt))
        throw new Error("HEARTBEAT_CREDENTIAL_INVALID");
      if(credential.robotId!==message.robotId) {
        await repo.recordFraudSignal({robotId:credential.robotId,credentialId:credential.id,
          messageId:message.messageId,type:"robot_identity_mismatch",severity:"high"});
        throw new Error("HEARTBEAT_IDENTITY_MISMATCH");
      }
      const canonical=canonicalHeartbeat(message);
      const signatureValid=headers.algorithm==="hmac-sha-256"&&credential.type==="hmac_secret"&&
        credential.encryptedSecret?verifyHmac(canonical,decryptSecret(credential.encryptedSecret,
          this.config.ROBOT_HEARTBEAT_HMAC_ENCRYPTION_KEY),headers.signature):
        headers.algorithm==="ed25519"&&credential.type==="public_key_signature"&&credential.publicKey?
          verifyEd25519(canonical,credential.publicKey,headers.signature):false;
      if(!signatureValid){
        await repo.recordFraudSignal({robotId:credential.robotId,credentialId:credential.id,
          messageId:message.messageId,type:"signature_failure",severity:"high"});
        throw new Error("HEARTBEAT_SIGNATURE_INVALID");
      }
      const age=(receivedAt.getTime()-message.sentAt.getTime())/1000;
      if(age < -this.config.HEARTBEAT_MAX_FUTURE_SECONDS)
        throw new Error("HEARTBEAT_TIMESTAMP_FUTURE");
      if(age > this.config.HEARTBEAT_MAX_CLOCK_SKEW_SECONDS)
        throw new Error("HEARTBEAT_TIMESTAMP_STALE");
      const nonceHash=sha256(message.nonce);
      const payloadHash=sha256(canonical);
      const duplicate=await repo.heartbeatByMessageOrNonce(credential.id,message.messageId,nonceHash);
      if(duplicate)return {accepted:true,messageId:message.messageId,robotId:message.robotId,
        heartbeatState:"online",mappedOperationalState:"unknown",assignmentCorrelation:"unknown",
        scheduleCorrelation:"unknown",operatingTimeDecision:"duplicate",
        serverReceivedAt:receivedAt,nextHeartbeatDueAt:new Date(receivedAt.getTime()+
          this.config.HEARTBEAT_EXPECTED_INTERVAL_SECONDS*1000)};
      const replay=await repo.replayStateForUpdate(message.robotId,credential.id);
      const lowest=replay?.lowest??0;
      if(message.sequenceNumber<lowest){
        await repo.recordFraudSignal({robotId:message.robotId,credentialId:credential.id,
          messageId:message.messageId,type:"sequence_regression",severity:"high"});
        throw new Error("HEARTBEAT_SEQUENCE_REPLAY");
      }
      const context=await repo.context(message);
      const identityValid=Boolean(context&&context.robot.manufacturerId===credential.manufacturerId&&
        context.robot.serial===message.manufacturerSerialNumber);
      const assignmentMatched=Boolean(context&&context.assignment.robotId===message.robotId&&
        context.assignment.manufacturerId===credential.manufacturerId);
      const eligible=Boolean(context&&identityValid&&assignmentMatched&&context.withinSchedule&&
        context.contract.status==="approved"&&["ready","scheduled","active"].includes(context.assignment.status)&&
        context.mappedState==="operating"&&message.networkStatus==="connected"&&
        context.robot.activationState==="activated"&&context.robot.ownershipState==="ownership_verified"&&
        context.robot.maintenanceState==="no_maintenance"&&context.robot.complianceState==="eligible"&&
        context.robot.lifecycleState==="active"&&context.robot.ownerOrganizationId);
      const decision=!context?"assignment_not_active":!identityValid?"robot_not_eligible":
        !assignmentMatched?"assignment_not_active":!context.withinSchedule?"outside_schedule":
        context.contract.status!=="approved"?"contract_not_active":
        context.mappedState!=="operating"||message.networkStatus!=="connected"?"state_not_operating":
        eligible?"eligible":"robot_not_eligible";
      await repo.insertHeartbeat({message,credentialId:credential.id,manufacturerId:credential.manufacturerId,
        contractId:context?.contract.id,nonceHash,payloadHash,receivedAt,headers,
        mappedState:context?.mappedState??"unknown",identityValid,assignmentMatched,
        withinSchedule:context?.withinSchedule??false,decision,
        validationStatus:eligible?"accepted":"accepted_not_eligible"});
      const highest=Math.max(replay?.highest??-1,message.sequenceNumber);
      await repo.updateReplayState({robotId:message.robotId,credentialId:credential.id,highest,
        lowest:Math.max(0,highest-this.config.HEARTBEAT_SEQUENCE_REORDER_WINDOW),
        messageId:message.messageId,sentAt:message.sentAt,receivedAt});
      await repo.updateProjection({robotId:message.robotId,credentialId:credential.id,
        messageId:message.messageId,sentAt:message.sentAt,receivedAt,
        mappedState:context?.mappedState??"unknown",assignmentId:context?.assignment.id,
        nextExpectedAt:new Date(receivedAt.getTime()+this.config.HEARTBEAT_EXPECTED_INTERVAL_SECONDS*1000),
        offlineAfterAt:new Date(receivedAt.getTime()+this.config.HEARTBEAT_OFFLINE_THRESHOLD_SECONDS*1000),
        heartbeatState:"online"});
      let verifiedSeconds=0;
      if(eligible&&context){
        const result=await repo.applyEligibleHeartbeat({context,message,receivedAt,
          maxExtensionSeconds:this.config.HEARTBEAT_EXPECTED_INTERVAL_SECONDS+
            this.config.HEARTBEAT_GRACE_PERIOD_SECONDS,
          calculationVersion:this.config.HEARTBEAT_CALCULATION_VERSION});
        verifiedSeconds=result.verifiedSeconds;
      }else if(context)await repo.closeOperatingInterval({assignmentId:context.assignment.id,
        effectiveAt:message.sentAt,reason:decision});
      await repo.audit("heartbeat.accepted","robot",message.robotId,{messageId:message.messageId,decision});
      await repo.outbox("heartbeat.accepted","robot",message.robotId,{messageId:message.messageId,
        decision,verifiedSeconds});
      return {accepted:true,messageId:message.messageId,robotId:message.robotId,
        heartbeatState:"online",mappedOperationalState:context?.mappedState??"unknown",
        assignmentCorrelation:assignmentMatched?"matched":"not_matched",
        scheduleCorrelation:context?.withinSchedule?"within_window":"outside_window",
        operatingTimeDecision:decision,serverReceivedAt:receivedAt,
        nextHeartbeatDueAt:new Date(receivedAt.getTime()+
          this.config.HEARTBEAT_EXPECTED_INTERVAL_SECONDS*1000)};
    });
  }
}
