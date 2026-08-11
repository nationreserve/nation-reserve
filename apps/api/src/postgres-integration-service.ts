/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await, @typescript-eslint/no-base-to-string */
import {
  ActivationService,
  constantTimeHashEqual,
  CredentialService,
  hashIntegrationSecret,
  OwnershipService,
  parseCredential,
  RegistrationService,
  type IntegrationConfig,
  type IntegrationPrincipal,
  type ManufacturerScope,
} from "@nation-reserve/robot-integration";
import { PostgresIntegrationUnitOfWork } from "@nation-reserve/database";
import { createOpaqueToken } from "@nation-reserve/auth";
import type { Pool, PoolClient } from "pg";
import type { IntegrationRouteService } from "./integration-routes.js";

export class PostgresIntegrationRouteService implements IntegrationRouteService {
  readonly #credentials: CredentialService;
  readonly #registrations: RegistrationService;
  readonly #ownership: OwnershipService;
  readonly #activation: ActivationService;
  constructor(private readonly pool: Pool, private readonly config: IntegrationConfig) {
    const uow = new PostgresIntegrationUnitOfWork(pool);
    this.#credentials = new CredentialService(uow, config);
    this.#registrations = new RegistrationService(uow, config.apiKeyPepper);
    this.#ownership = new OwnershipService(uow, config.apiKeyPepper);
    this.#activation = new ActivationService(uow, config);
  }
  async authenticateCredential(raw: string): Promise<IntegrationPrincipal> {
    const parsed = parseCredential(raw);
    const result = await this.pool.query(`SELECT c.id,c.manufacturer_id,c.environment,c.secret_hash,
      c.scopes,c.status,c.expires_at,c.overlap_ends_at,m.integration_status,m.suspended_at
      FROM manufacturer_api_credentials c JOIN manufacturers m ON m.id=c.manufacturer_id
      WHERE c.credential_prefix=$1`, [parsed.prefix]);
    const row = result.rows[0];
    const supplied = hashIntegrationSecret(raw, this.config.apiKeyPepper);
    if (!row || !constantTimeHashEqual(supplied, row.secret_hash) ||
        !["active","rotating"].includes(row.status) || row.expires_at <= new Date() ||
        row.environment !== parsed.environment || row.suspended_at ||
        (row.environment === "production" && row.integration_status !== "production_enabled")) {
      throw denied("MANUFACTURER_AUTHENTICATION_FAILED", 401);
    }
    await this.pool.query("UPDATE manufacturer_api_credentials SET last_used_at=now() WHERE id=$1", [row.id]);
    return { manufacturerId: row.manufacturer_id, credentialId: row.id,
      environment: row.environment, scopes: row.scopes as ManufacturerScope[] };
  }
  async application(userId: string, organizationId: string) {
    const manufacturer = await this.manufacturer(userId, organizationId, false);
    return (await this.pool.query(`SELECT * FROM manufacturer_applications
      WHERE manufacturer_id=$1 AND is_current`, [manufacturer.id])).rows[0] ?? {};
  }
  async saveApplication(userId: string, organizationId: string, input: object) {
    const manufacturer = await this.manufacturer(userId, organizationId, true);
    const value = input as Record<string, unknown>;
    const result = await this.pool.query(`INSERT INTO manufacturer_applications
      (manufacturer_id,legal_business_name,website_url,support_email,technical_contact_name,
       technical_contact_email,operations_contact_name,operations_contact_email,primary_country_code,
       business_description,robot_categories,anticipated_robot_volume,integration_readiness,compliance_attestation)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT(manufacturer_id) WHERE is_current DO UPDATE SET
       legal_business_name=EXCLUDED.legal_business_name,website_url=EXCLUDED.website_url,
       support_email=EXCLUDED.support_email,technical_contact_name=EXCLUDED.technical_contact_name,
       technical_contact_email=EXCLUDED.technical_contact_email,
       operations_contact_name=EXCLUDED.operations_contact_name,
       operations_contact_email=EXCLUDED.operations_contact_email,
       primary_country_code=EXCLUDED.primary_country_code,business_description=EXCLUDED.business_description,
       robot_categories=EXCLUDED.robot_categories,anticipated_robot_volume=EXCLUDED.anticipated_robot_volume,
       integration_readiness=EXCLUDED.integration_readiness,
       compliance_attestation=EXCLUDED.compliance_attestation
      WHERE manufacturer_applications.status IN ('draft','information_requested') RETURNING *`,
    [manufacturer.id,value.legalBusinessName,value.websiteUrl,value.supportEmail,value.technicalContactName,
      value.technicalContactEmail,value.operationsContactName,value.operationsContactEmail,
      value.primaryCountryCode,value.businessDescription,JSON.stringify(value.robotCategories ?? []),
      value.anticipatedRobotVolume,JSON.stringify(value.integrationReadiness ?? {}),
      JSON.stringify(value.complianceAttestation ?? {})]);
    if (!result.rowCount) throw denied("APPLICATION_IMMUTABLE", 409);
    return result.rows[0];
  }
  async submitApplication(userId: string, organizationId: string) {
    const manufacturer = await this.manufacturer(userId, organizationId, true);
    await this.businessTransaction(async (client) => {
      const result = await client.query(`UPDATE manufacturer_applications SET status='submitted',
        submitted_at=now() WHERE manufacturer_id=$1 AND is_current AND status IN ('draft','information_requested')
        RETURNING id`, [manufacturer.id]);
      if (!result.rowCount) throw denied("APPLICATION_NOT_SUBMITTABLE", 409);
      await event(client, userId, "manufacturer.application.submitted", "manufacturer",
        manufacturer.id, { applicationId: result.rows[0].id });
    });
  }
  async reviewApplication(userId: string, applicationId: string, action: string, reason?: string) {
    await this.platform(userId, ["platform_admin","super_admin"]);
    if (["rejected","information_requested"].includes(action) && !reason) throw denied("DECISION_REASON_REQUIRED", 400);
    await this.businessTransaction(async (client) => {
      const found = await client.query(`SELECT a.*,m.sandbox_approved_at FROM manufacturer_applications a
        JOIN manufacturers m ON m.id=a.manufacturer_id WHERE a.id=$1 FOR UPDATE`, [applicationId]);
      const row = found.rows[0]; if (!row) throw denied("NOT_FOUND", 404);
      if (action === "production_approved" && !row.sandbox_approved_at) throw denied("SANDBOX_APPROVAL_REQUIRED", 409);
      await client.query(`UPDATE manufacturer_applications SET status=$2,reviewed_at=now(),
        reviewed_by_user_id=$3,decision_reason=$4 WHERE id=$1`, [applicationId, action, userId, reason]);
      if (action === "sandbox_approved") await client.query(`UPDATE manufacturers SET
        sandbox_approved_at=now(),approval_status='approved',integration_status='sandbox_testing'
        WHERE id=$1`, [row.manufacturer_id]);
      if (action === "production_approved") await client.query(`UPDATE manufacturers SET
        production_approved_at=now(),production_access_status='enabled',
        integration_status='production_enabled' WHERE id=$1`, [row.manufacturer_id]);
      await event(client, userId, `manufacturer.application.${action}`, "manufacturer",
        row.manufacturer_id, { applicationId, reason });
    });
  }
  async credentials(userId: string, organizationId: string) {
    const manufacturer = await this.manufacturer(userId, organizationId, false);
    return (await this.pool.query(`SELECT id,environment,credential_name,credential_prefix,status,
      scopes,allowed_api_versions,created_at,last_used_at,expires_at,rotated_at,revoked_at
      FROM manufacturer_api_credentials WHERE manufacturer_id=$1 ORDER BY created_at DESC`,
    [manufacturer.id])).rows;
  }
  async createCredential(userId: string, organizationId: string, input: object) {
    const manufacturer = await this.manufacturer(userId, organizationId, true);
    const value = input as { environment: "sandbox"|"production"; name: string; scopes: ManufacturerScope[] };
    return this.#credentials.issue(userId, manufacturer.id, value.environment, value.name, value.scopes);
  }
  async rotateCredential(userId: string, organizationId: string, credentialId: string) {
    const manufacturer = await this.manufacturer(userId, organizationId, true);
    const prior = (await this.pool.query(`SELECT * FROM manufacturer_api_credentials
      WHERE id=$1 AND manufacturer_id=$2 AND status='active'`, [credentialId, manufacturer.id])).rows[0];
    if (!prior) throw denied("NOT_FOUND", 404);
    const created = await this.#credentials.issue(userId, manufacturer.id, prior.environment,
      `${prior.credential_name} replacement`, prior.scopes);
    await this.pool.query(`UPDATE manufacturer_api_credentials SET status='rotating',rotated_at=now(),
      overlap_ends_at=now()+make_interval(secs=>$2) WHERE id=$1`,
    [credentialId, this.config.credentialRotationOverlapSeconds]);
    return created;
  }
  async revokeCredential(userId: string, organizationId: string, credentialId: string, reason: string) {
    const manufacturer = await this.manufacturer(userId, organizationId, true);
    await this.pool.query(`UPDATE manufacturer_api_credentials SET status='revoked',revoked_at=now(),
      revocation_reason=$3 WHERE id=$1 AND manufacturer_id=$2`, [credentialId, manufacturer.id, reason]);
  }
  async models(userId: string, organizationId: string) {
    const manufacturer = await this.manufacturer(userId, organizationId, false);
    return (await this.pool.query(`SELECT m.*,COALESCE(json_agg(r ORDER BY r.revision_number)
      FILTER(WHERE r.id IS NOT NULL),'[]') AS revisions FROM robot_models m
      LEFT JOIN robot_model_revisions r ON r.robot_model_id=m.id WHERE m.manufacturer_id=$1
      GROUP BY m.id ORDER BY m.created_at DESC`, [manufacturer.id])).rows;
  }
  async createModel(userId: string, organizationId: string, input: object) {
    const manufacturer = await this.manufacturer(userId, organizationId, true);
    const value = input as Record<string, unknown>;
    return this.businessTransaction(async (client) => {
      const model = (await client.query(`INSERT INTO robot_models
        (manufacturer_id,model_name,model_code,model_version,description,robot_category,approval_status,
         capabilities,supported_api_versions,operational_state_mapping)
        VALUES($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9) RETURNING *`,
      [manufacturer.id,value.modelName,value.modelCode,value.modelVersion,value.description,
        value.robotCategory,JSON.stringify(value.capabilities ?? {}),JSON.stringify(value.supportedApiVersions ?? []),
        JSON.stringify(value.operationalStateMapping ?? {})])).rows[0];
      await client.query(`INSERT INTO robot_model_revisions
        (robot_model_id,revision_number,model_version,capabilities,supported_api_versions,
         operational_state_mapping,created_by_user_id,status)
        VALUES($1,1,$2,$3,$4,$5,$6,'draft')`, [model.id,value.modelVersion,
        JSON.stringify(value.capabilities ?? {}),JSON.stringify(value.supportedApiVersions ?? []),
        JSON.stringify(value.operationalStateMapping ?? {}),userId]);
      await event(client,userId,"robot.model.created","robot_model",model.id,{});
      return model;
    });
  }
  async submitModel(userId: string, organizationId: string, modelId: string) {
    const manufacturer = await this.manufacturer(userId, organizationId, true);
    await this.pool.query(`UPDATE robot_models SET approval_status='submitted',submitted_at=now()
      WHERE id=$1 AND manufacturer_id=$2 AND approval_status='draft'`, [modelId, manufacturer.id]);
    await this.pool.query(`UPDATE robot_model_revisions SET status='submitted',submitted_at=now()
      WHERE robot_model_id=$1 AND status='draft'`, [modelId]);
  }
  async reviewModel(userId: string, modelId: string, action: string, reason?: string) {
    await this.platform(userId, ["platform_admin","super_admin"]);
    if (action === "rejected" && !reason) throw denied("DECISION_REASON_REQUIRED", 400);
    await this.businessTransaction(async (client) => {
      await client.query(`UPDATE robot_models SET approval_status=$2,reviewed_at=now(),
        reviewed_by_user_id=$3,decision_reason=$4 WHERE id=$1`, [modelId,action,userId,reason]);
      await client.query(`UPDATE robot_model_revisions SET status=$2,reviewed_at=now()
        WHERE robot_model_id=$1 AND status IN ('submitted','under_review')`, [modelId,action]);
      await event(client,userId,`robot.model.${action}`,"robot_model",modelId,{reason});
    });
  }
  registerRobot(principal: IntegrationPrincipal, input: object) {
    const value = input as Record<string, unknown>;
    return this.#registrations.register(principal, {
      modelId: String(value.modelId),modelRevisionId:String(value.modelRevisionId),
      environment:value.environment as "sandbox"|"production",serialNumber:String(value.manufacturerSerialNumber),
      apiVersion:String(value.apiVersion),idempotencyKey:String(value.idempotencyKey),
      ...(value.hardwareRevision ? { hardwareRevision:String(value.hardwareRevision) }:{}),
      ...(value.firmwareVersion ? { firmwareVersion:String(value.firmwareVersion) }:{}),
      ...(value.hardwareIdentityValue ? { hardwareIdentityValue:String(value.hardwareIdentityValue) }:{}),
      ...(value.regionCode ? { regionCode:String(value.regionCode) }:{}),
    });
  }
  async registration(principal: IntegrationPrincipal, id: string) {
    const row = (await this.pool.query(`SELECT * FROM robot_registration_requests
      WHERE id=$1 AND manufacturer_id=$2 AND environment=$3`, [id,principal.manufacturerId,principal.environment])).rows[0];
    if (!row) throw denied("NOT_FOUND",404); return row;
  }
  async integrationRobot(principal: IntegrationPrincipal, id: string) {
    const row = (await this.pool.query(`SELECT id,manufacturer_id,robot_model_id,manufacturer_serial_number,
      registration_state,ownership_state,activation_state,hardware_identity_status,firmware_version,
      environment,created_at FROM robots WHERE id=$1 AND manufacturer_id=$2 AND environment=$3`,
    [id,principal.manufacturerId,principal.environment])).rows[0];
    if (!row) throw denied("NOT_FOUND",404); return row;
  }
  async manufacturerRobots(userId: string, organizationId: string) {
    const manufacturer=await this.manufacturer(userId,organizationId,false);
    return (await this.pool.query(`SELECT r.*,m.model_name FROM robots r JOIN robot_models m ON m.id=r.robot_model_id
      WHERE r.manufacturer_id=$1 ORDER BY r.created_at DESC`,[manufacturer.id])).rows;
  }
  async robot(userId: string, robotId: string) {
    const row=(await this.pool.query(`SELECT r.*,m.model_name,o.owner_organization_id FROM robots r
      JOIN robot_models m ON m.id=r.robot_model_id LEFT JOIN robot_ownership_records o ON o.robot_id=r.id
      AND o.ownership_status='verified' AND o.ownership_end_at IS NULL WHERE r.id=$1`,[robotId])).rows[0];
    if(!row) throw denied("NOT_FOUND",404);
    const allowed=await this.pool.query(`SELECT 1 FROM organization_memberships om
      LEFT JOIN manufacturers mf ON mf.organization_id=om.organization_id
      WHERE om.user_id=$1 AND om.status='active' AND (mf.id=$2 OR om.organization_id=$3)`,
    [userId,row.manufacturer_id,row.owner_organization_id]);
    if(!allowed.rowCount) throw denied("PERMISSION_DENIED",403); return row;
  }
  async createTransferCode(userId:string,organizationId:string,robotId:string){
    const manufacturer=await this.manufacturer(userId,organizationId,true);
    const robot=(await this.pool.query("SELECT id FROM robots WHERE id=$1 AND manufacturer_id=$2",
      [robotId,manufacturer.id])).rows[0]; if(!robot) throw denied("NOT_FOUND",404);
    const code=createOpaqueToken();
    const row=(await this.pool.query(`INSERT INTO robot_transfer_codes
      (robot_id,manufacturer_id,code_hash,expires_at,created_by_user_id)
      VALUES($1,$2,$3,now()+make_interval(secs=>$4),$5) RETURNING id,expires_at`,
    [robotId,manufacturer.id,hashIntegrationSecret(code,this.config.apiKeyPepper),
      this.config.transferCodeTtlSeconds,userId])).rows[0];
    return {...row,code};
  }
  async claimRobot(userId:string,robotId:string,input:object){
    const value=input as {ownerOrganizationId:string;transferCode:string};
    return this.#ownership.claim(userId,value.ownerOrganizationId,robotId,value.transferCode);
  }
  startActivation(principal:IntegrationPrincipal,robotId:string){return this.#activation.start(principal,robotId);}
  testActivation(principal:IntegrationPrincipal,id:string,input:object){
    const v=input as {requestId:string;nonce:string;timestamp:string|Date;manufacturerState:string};
    return this.#activation.test(principal,id,{...v,timestamp:new Date(v.timestamp)});
  }
  completeActivation(principal:IntegrationPrincipal,id:string){return this.#activation.complete(principal,id);}
  async platformList(userId:string,resource:string){
    await this.platform(userId,["operations","security","platform_admin","super_admin"]);
    const table:Record<string,string>={"manufacturers/applications":"manufacturer_applications",
      "robot-models":"robot_models","robot-registrations":"robot_registration_requests",
      "ownership-claims":"robot_ownership_claims","activations":"robot_activation_sessions"};
    return (await this.pool.query(`SELECT * FROM ${table[resource]} ORDER BY created_at DESC LIMIT 200`)).rows;
  }
  private async manufacturer(userId:string,organizationId:string,write:boolean){
    const row=(await this.pool.query(`SELECT m.id,o.status,om.role,om.status AS membership_status
      FROM manufacturers m JOIN organizations o ON o.id=m.organization_id
      JOIN organization_memberships om ON om.organization_id=o.id
      WHERE o.id=$1 AND om.user_id=$2`,[organizationId,userId])).rows[0];
    if(!row||row.membership_status!=="active"||(write&&row.role!=="administrator")) throw denied("PERMISSION_DENIED",403);
    return row;
  }
  private async platform(userId:string,roles:string[]){
    const row=(await this.pool.query(`SELECT 1 FROM organization_memberships om JOIN organizations o
      ON o.id=om.organization_id WHERE om.user_id=$1 AND o.organization_type='platform'
      AND om.status='active' AND om.role=ANY($2)`,[userId,roles])).rows[0];
    if(!row) throw denied("PERMISSION_DENIED",403);
  }
  private async businessTransaction<T>(work:(client:PoolClient)=>Promise<T>){
    const client=await this.pool.connect();
    try{await client.query("BEGIN");const result=await work(client);await client.query("COMMIT");return result;}
    catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  }
}
async function event(client:PoolClient,actorId:string,type:string,aggregateType:string,
  aggregateId:string,payload:object){
  await client.query(`INSERT INTO audit_logs(actor_type,actor_id,action,entity_type,entity_id,metadata)
    VALUES('user',$1,$2,$3,$4,$5)`,[actorId,type,aggregateType,aggregateId,payload]);
  await client.query(`INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,occurred_at,payload,metadata)
    VALUES(gen_random_uuid(),$1,$2,$3,now(),$4,'{"schemaVersion":1}')`,
  [type,aggregateType,aggregateId,payload]);
}
function denied(code:string,statusCode:number){return Object.assign(new Error(code),{code,statusCode});}

