/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { AllocationService,ContractService,type CreateContractCommand,type ReviseContractCommand,
  type AllocationCommand } from "@nation-reserve/contract-operations";
import { PostgresContractUnitOfWork } from "@nation-reserve/database";
import type { Pool } from "pg";
import type { ContractRouteService } from "./contract-routes.js";

export class PostgresContractRouteService implements ContractRouteService {
  readonly #contracts:ContractService;readonly #allocations:AllocationService;
  constructor(private readonly pool:Pool){
    const uow=new PostgresContractUnitOfWork(pool);
    this.#contracts=new ContractService(uow);this.#allocations=new AllocationService(uow);
  }
  async list(userId:string,organizationId:string,side:"company"|"manufacturer"){
    const scope=await this.scope(userId,organizationId,side,false);
    const column=side==="company"?"hiring_company_id":"manufacturer_id";
    return (await this.pool.query(`SELECT c.*,v.id AS current_version_id,v.status AS version_status,
      c.requested_robot_count-c.assigned_robot_count AS remaining_robot_count
      FROM contracts c JOIN contract_versions v ON v.contract_id=c.id
      AND v.version_number=c.current_version_number WHERE c.${column}=$1 ORDER BY c.created_at DESC`,
    [scope.profileId])).rows;
  }
  async detail(userId:string,organizationId:string,contractId:string){
    const scope=await this.anyScope(userId,organizationId,false);
    const row=(await this.pool.query(`SELECT c.*,COALESCE(json_agg(DISTINCT v ORDER BY v.version_number)
      FILTER(WHERE v.id IS NOT NULL),'[]') AS versions FROM contracts c
      LEFT JOIN contract_versions v ON v.contract_id=c.id WHERE c.id=$1
      AND (c.hiring_company_id=$2 OR c.manufacturer_id=$2) GROUP BY c.id`,
    [contractId,scope.profileId])).rows[0];
    if(!row)throw denied("CONTRACT_NOT_FOUND",404);
    const assignments=(await this.pool.query(`SELECT a.*,r.manufacturer_serial_number,r.activation_state,
      r.final_lifecycle_state,o.display_name AS owner_name FROM robot_assignments a
      JOIN robots r ON r.id=a.robot_id JOIN organizations o ON o.id=a.robot_owner_organization_id
      WHERE a.contract_id=$1 ORDER BY a.created_at`,[contractId])).rows;
    return {...row,assignments};
  }
  async create(userId:string,organizationId:string,input:object){
    const scope=await this.scope(userId,organizationId,"company",true);
    const command=input as CreateContractCommand;
    if(command.hiringCompanyId!==scope.profileId)throw denied("RESOURCE_ORGANIZATION_MISMATCH",403);
    return this.#contracts.create(userId,command);
  }
  async revise(userId:string,organizationId:string,contractId:string,input:object){
    await this.contractScope(userId,organizationId,contractId,true);
    return this.#contracts.revise(userId,contractId,input as ReviseContractCommand);
  }
  async submit(userId:string,organizationId:string,contractId:string){
    await this.contractScope(userId,organizationId,contractId,true);
    await this.pool.query(`UPDATE contract_versions SET status='pending_manufacturer_approval'
      WHERE contract_id=$1 AND version_number=(SELECT current_version_number FROM contracts WHERE id=$1)
      AND status='draft'`,[contractId]);
    await this.pool.query("UPDATE contracts SET status='pending_manufacturer_approval' WHERE id=$1",[contractId]);
  }
  async decide(userId:string,organizationId:string,versionId:string,
    party:"hiring_company"|"manufacturer",decision:"approved"|"changes_requested"|"rejected",reason?:string){
    const version=(await this.pool.query("SELECT contract_id FROM contract_versions WHERE id=$1",[versionId])).rows[0];
    if(!version)throw denied("CONTRACT_VERSION_NOT_FOUND",404);
    const scope=await this.contractScope(userId,organizationId,version.contract_id,true);
    if((party==="manufacturer"&&scope.side!=="manufacturer")||
      (party==="hiring_company"&&scope.side!=="company"))throw denied("PERMISSION_DENIED",403);
    return this.#contracts.decide(userId,versionId,party,decision,reason);
  }
  async allocate(userId:string,organizationId:string,contractId:string,input:object){
    const scope=await this.contractScope(userId,organizationId,contractId,true);
    if(scope.side!=="manufacturer")throw denied("PERMISSION_DENIED",403);
    return this.#allocations.allocate(userId,contractId,input as AllocationCommand);
  }
  async assignment(userId:string,organizationId:string,assignmentId:string){
    const scope=await this.anyScope(userId,organizationId,false);
    const row=(await this.pool.query(`SELECT a.*,r.manufacturer_serial_number,r.activation_state,
      r.final_lifecycle_state,o.display_name AS owner_name,f.name AS facility_name,d.name AS department_name
      FROM robot_assignments a JOIN robots r ON r.id=a.robot_id
      JOIN organizations o ON o.id=a.robot_owner_organization_id JOIN facilities f ON f.id=a.facility_id
      LEFT JOIN departments d ON d.id=a.department_id WHERE a.id=$1
      AND (a.hiring_company_id=$2 OR a.manufacturer_id=$2)`,[assignmentId,scope.profileId])).rows[0];
    if(!row)throw denied("ASSIGNMENT_NOT_FOUND",404);return row;
  }
  async replace(userId:string,organizationId:string,assignmentId:string,robotId:string){
    const assignment=(await this.pool.query("SELECT contract_id FROM robot_assignments WHERE id=$1",
      [assignmentId])).rows[0];if(!assignment)throw denied("ASSIGNMENT_NOT_FOUND",404);
    const scope=await this.contractScope(userId,organizationId,assignment.contract_id,true);
    if(scope.side!=="manufacturer")throw denied("PERMISSION_DENIED",403);
    return this.#allocations.replace(userId,assignmentId,robotId);
  }
  async cancelAssignment(userId:string,organizationId:string,assignmentId:string,
    party:"hiring_company"|"manufacturer"|"platform",reason:string){
    const assignment=(await this.pool.query("SELECT contract_id FROM robot_assignments WHERE id=$1",
      [assignmentId])).rows[0];if(!assignment)throw denied("ASSIGNMENT_NOT_FOUND",404);
    const scope=await this.contractScope(userId,organizationId,assignment.contract_id,true);
    if((party==="manufacturer"&&scope.side!=="manufacturer")||
      (party==="hiring_company"&&scope.side!=="company"))throw denied("PERMISSION_DENIED",403);
    await this.#allocations.cancel(userId,assignmentId,party,reason);
  }
  private async scope(userId:string,organizationId:string,side:"company"|"manufacturer",write:boolean){
    const table=side==="company"?"hiring_companies":"manufacturers";
    const row=(await this.pool.query(`SELECT p.id AS profile_id,m.role,m.status AS membership_status,
      o.status AS organization_status FROM ${table} p JOIN organizations o ON o.id=p.organization_id
      JOIN organization_memberships m ON m.organization_id=o.id WHERE o.id=$1 AND m.user_id=$2`,
    [organizationId,userId])).rows[0];
    const writable=side==="company"?["administrator","manager"]:["administrator","manager"];
    if(!row||row.membership_status!=="active"||row.organization_status!=="active"||
      (write&&!writable.includes(row.role)))throw denied("PERMISSION_DENIED",403);
    return{profileId:row.profile_id as string,side};
  }
  private async anyScope(userId:string,organizationId:string,write:boolean){
    try{return await this.scope(userId,organizationId,"company",write);}
    catch{return this.scope(userId,organizationId,"manufacturer",write);}
  }
  private async contractScope(userId:string,organizationId:string,contractId:string,write:boolean){
    const scope=await this.anyScope(userId,organizationId,write);
    const row=(await this.pool.query("SELECT hiring_company_id,manufacturer_id FROM contracts WHERE id=$1",
      [contractId])).rows[0];
    if(!row||(scope.side==="company"&&row.hiring_company_id!==scope.profileId)||
      (scope.side==="manufacturer"&&row.manufacturer_id!==scope.profileId))
      throw denied("RESOURCE_ORGANIZATION_MISMATCH",403);
    return scope;
  }
}
function denied(code:string,statusCode:number){return Object.assign(new Error(code),{code,statusCode});}

