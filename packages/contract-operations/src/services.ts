import type { AllocationCommand, CreateContractCommand, ReviseContractCommand } from "./schemas.js";

export interface ContractRecord {
  id:string; manufacturerId:string; hiringCompanyId:string; facilityId:string;
  departmentId:string|null; status:string; currentVersionNumber:number; requestedRobotCount:number;
  assignedRobotCount:number;
}
export interface VersionRecord {
  id:string; contractId:string; versionNumber:number; status:string;
  manufacturerApprovedAt:Date|null; companyApprovedAt:Date|null;
}
export interface AllocationRobot {
  id:string; manufacturerId:string; modelId:string; ownerOrganizationId:string|null;
  registrationState:string; ownershipState:string; activationState:string; operationalState:string;
  complianceState:string; finalLifecycleState:string; maintenanceState:string;
}
export interface ContractRepositories {
  hiringCompanyForUpdate(id:string):Promise<{id:string;organizationId:string;status:string}|undefined>;
  manufacturer(id:string):Promise<{id:string;organizationId:string;approved:boolean}|undefined>;
  facility(id:string):Promise<{id:string;hiringCompanyId:string}|undefined>;
  department(id:string):Promise<{id:string;facilityId:string}|undefined>;
  activeFinancialConfiguration():Promise<{id:string}|undefined>;
  createContract(input:object):Promise<ContractRecord>;
  contractForUpdate(id:string):Promise<ContractRecord|undefined>;
  versionForUpdate(id:string):Promise<VersionRecord|undefined>;
  createVersion(input:object):Promise<VersionRecord>;
  addVersionModels(versionId:string,models:CreateContractCommand["models"]):Promise<void>;
  addSchedules(versionId:string,rules:CreateContractCommand["scheduleRules"],
    exceptions:CreateContractCommand["scheduleExceptions"]):Promise<void>;
  recordDecision(input:object):Promise<void>;
  updateApproval(input:object):Promise<{contract:ContractRecord;version:VersionRecord}>;
  robotForAllocation(id:string):Promise<AllocationRobot|undefined>;
  modelAllowed(versionId:string,modelId:string):Promise<boolean>;
  assignmentConflict(robotId:string,start:Date,end:Date):Promise<boolean>;
  createAssignment(input:object):Promise<{id:string}>;
  assignmentForUpdate(id:string):Promise<Record<string,unknown>|undefined>;
  updateAssignment(id:string,input:object):Promise<void>;
  refreshFulfillment(contractId:string):Promise<{assigned:number;requested:number;status:string}>;
  audit(action:string,type:string,id:string,metadata?:object):Promise<void>;
  outbox(type:string,aggregateType:string,id:string,payload:object):Promise<void>;
}
export interface ContractUnitOfWork {
  transaction<T>(work:(repo:ContractRepositories)=>Promise<T>):Promise<T>;
}
export class ContractService {
  constructor(private readonly uow:ContractUnitOfWork){}
  async create(actorId:string,command:CreateContractCommand){
    return this.uow.transaction(async(repo)=>{
      const [company,manufacturer,facility,financial]=await Promise.all([
        repo.hiringCompanyForUpdate(command.hiringCompanyId),repo.manufacturer(command.manufacturerId),
        repo.facility(command.facilityId),repo.activeFinancialConfiguration()]);
      if(!company||company.status!=="active")throw new Error("HIRING_COMPANY_NOT_ACTIVE");
      if(!manufacturer?.approved)throw new Error("MANUFACTURER_NOT_APPROVED");
      if(!facility||facility.hiringCompanyId!==company.id)throw new Error("FACILITY_COMPANY_MISMATCH");
      if(command.departmentId){
        const department=await repo.department(command.departmentId);
        if(!department||department.facilityId!==facility.id)throw new Error("DEPARTMENT_FACILITY_MISMATCH");
      }
      if(!financial)throw new Error("FINANCIAL_CONFIGURATION_NOT_FOUND");
      const requested=command.models.reduce((sum,item)=>sum+item.quantity,0);
      const contract=await repo.createContract({...command,requestedRobotCount:requested,
        createdByUserId:actorId,rateConfigurationVersionId:financial.id,status:"draft"});
      const version=await repo.createVersion({contractId:contract.id,versionNumber:1,...command,
        requestedRobotCount:requested,createdByUserId:actorId,status:"draft"});
      await repo.addVersionModels(version.id,command.models);
      await repo.addSchedules(version.id,command.scheduleRules,command.scheduleExceptions);
      await repo.audit("contract.created","contract",contract.id,{versionId:version.id});
      await repo.outbox("contract.created","contract",contract.id,{versionId:version.id});
      return {contract,version};
    });
  }
  async revise(actorId:string,contractId:string,command:ReviseContractCommand){
    return this.uow.transaction(async(repo)=>{
      const contract=await repo.contractForUpdate(contractId);
      if(!contract||["completed","cancelled","archived"].includes(contract.status))
        throw new Error("CONTRACT_NOT_REVISABLE");
      const requested=command.models.reduce((sum,item)=>sum+item.quantity,0);
      const version=await repo.createVersion({contractId,versionNumber:contract.currentVersionNumber+1,
        ...command,requestedRobotCount:requested,createdByUserId:actorId,status:"draft"});
      await repo.addVersionModels(version.id,command.models);
      await repo.addSchedules(version.id,command.scheduleRules,command.scheduleExceptions);
      await repo.audit("contract.revised","contract",contractId,{versionId:version.id,reason:command.changeReason});
      await repo.outbox("contract.revised","contract",contractId,{versionId:version.id});
      return version;
    });
  }
  async decide(actorId:string,versionId:string,party:"hiring_company"|"manufacturer",
    decision:"approved"|"changes_requested"|"rejected",reason?:string){
    return this.uow.transaction(async(repo)=>{
      const version=await repo.versionForUpdate(versionId);
      if(!version)throw new Error("CONTRACT_VERSION_NOT_FOUND");
      if(decision!=="approved"&&!reason)throw new Error("DECISION_REASON_REQUIRED");
      await repo.recordDecision({versionId,contractId:version.contractId,party,decision,actorId,reason});
      const result=await repo.updateApproval({versionId,party,decision,actorId,reason});
      const both=Boolean(result.version.manufacturerApprovedAt&&result.version.companyApprovedAt);
      const event=decision==="approved"&&both?"contract.approved":
        decision==="approved"?"contract.approval.recorded":`contract.${decision}`;
      await repo.audit(event,"contract",version.contractId,{versionId,party,reason});
      await repo.outbox(event,"contract",version.contractId,{versionId,party});
      return result;
    });
  }
}
export class AllocationService {
  constructor(private readonly uow:ContractUnitOfWork){}
  async allocate(actorId:string,contractId:string,command:AllocationCommand){
    void actorId;
    return this.uow.transaction(async(repo)=>{
      const contract=await repo.contractForUpdate(contractId);
      const version=await repo.versionForUpdate(command.contractVersionId);
      if(!contract||!version||version.contractId!==contractId||version.status!=="approved")
        throw new Error("CONTRACT_NOT_ALLOCATABLE");
      const assignments: Array<{id:string}>=[];
      for(const robotId of command.robotIds){
        const robot=await repo.robotForAllocation(robotId);
        if(!robot||robot.manufacturerId!==contract.manufacturerId||
          robot.registrationState!=="registered"||robot.ownershipState!=="ownership_verified"||
          robot.activationState!=="activated"||robot.operationalState!=="available"||
          robot.complianceState!=="eligible"||robot.finalLifecycleState!=="active"||
          robot.maintenanceState!=="no_maintenance"||!robot.ownerOrganizationId)
          throw new Error("ROBOT_NOT_ALLOCATABLE");
        if(!await repo.modelAllowed(version.id,robot.modelId))throw new Error("ROBOT_MODEL_MISMATCH");
        if(await repo.assignmentConflict(robotId,command.scheduledStartAt,command.scheduledEndAt))
          throw new Error("ASSIGNMENT_TIME_CONFLICT");
        const assignment=await repo.createAssignment({contractId,contractVersionId:version.id,robotId,
          robotOwnerOrganizationId:robot.ownerOrganizationId,manufacturerId:contract.manufacturerId,
          hiringCompanyId:contract.hiringCompanyId,facilityId:contract.facilityId,
          departmentId:contract.departmentId,status:"ready",financialStatus:"not_eligible",
          scheduledStartAt:command.scheduledStartAt,scheduledEndAt:command.scheduledEndAt});
        assignments.push(assignment);
        await repo.audit("assignment.created","assignment",assignment.id,{contractId,robotId});
        await repo.outbox("assignment.created","assignment",assignment.id,{contractId,robotId});
      }
      const fulfillment=await repo.refreshFulfillment(contractId);
      await repo.outbox("robot.allocated","contract",contractId,{count:assignments.length,fulfillment});
      return {assignments,fulfillment};
    });
  }
  async replace(actorId:string,assignmentId:string,replacementRobotId:string){
    const prior=await this.uow.transaction(async(repo)=>{
      const assignment=await repo.assignmentForUpdate(assignmentId);
      if(!assignment)throw new Error("ASSIGNMENT_NOT_FOUND");
      return assignment;
    });
    const command={contractVersionId:String(prior.contract_version_id),robotIds:[replacementRobotId],
      scheduledStartAt:new Date(String(prior.scheduled_start_at)),
      scheduledEndAt:new Date(String(prior.scheduled_end_at))};
    const result=await this.allocate(actorId,String(prior.contract_id),command);
    const replacement=result.assignments[0]!;
    await this.uow.transaction(async(repo)=>{
      await repo.updateAssignment(assignmentId,{status:"replaced",reason:"robot_replaced"});
      await repo.updateAssignment(replacement.id,{replacementForAssignmentId:assignmentId});
      await repo.audit("assignment.replaced","assignment",replacement.id,{previousAssignmentId:assignmentId,actorId});
      await repo.outbox("assignment.replaced","assignment",replacement.id,{previousAssignmentId:assignmentId});
    });
    return replacement;
  }
  async cancel(actorId:string,assignmentId:string,party:"hiring_company"|"manufacturer"|"platform",
    reason:string){
    return this.uow.transaction(async(repo)=>{
      const assignment=await repo.assignmentForUpdate(assignmentId);
      if(!assignment)throw new Error("ASSIGNMENT_NOT_FOUND");
      await repo.updateAssignment(assignmentId,{status:"cancelled",party,reason});
      await repo.audit("assignment.cancelled","assignment",assignmentId,{party,reason,actorId});
      await repo.outbox("assignment.cancelled","assignment",assignmentId,{party,reason});
      await repo.refreshFulfillment(String(assignment.contract_id));
    });
  }
}


