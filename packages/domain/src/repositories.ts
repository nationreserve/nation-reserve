import type {
  AssignmentId,
  AuditRecordInput,
  ContractId,
  ContractVersionId,
  DomainEvent,
  FinancialConfigurationId,
  HiringCompanyId,
  ManufacturerId,
  OrganizationId,
  RobotId,
  RobotModelId,
} from "@nation-reserve/contracts";

import type {
  CreateAssignmentInput,
  CreateContractInput,
  CreateContractVersionInput,
  PersistedAssignment,
  PersistedContract,
  PersistedOwnership,
  PersistedRobot,
  RegisterRobotInput,
  VerifyOwnershipInput,
} from "./schemas.js";

export interface OrganizationRecord {
  id: OrganizationId;
  organizationType:
    | "robot_owner"
    | "hiring_company"
    | "manufacturer"
    | "platform";
  status: string;
}

export interface ManufacturerRecord {
  id: ManufacturerId;
  organizationId: OrganizationId;
  approvalStatus: string;
}

export interface RobotModelRecord {
  id: RobotModelId;
  manufacturerId: ManufacturerId;
  approvalStatus: string;
}

export interface HiringCompanyRecord {
  id: HiringCompanyId;
  organizationId: OrganizationId;
}

export interface FacilityRecord {
  id: string;
  hiringCompanyId: HiringCompanyId;
}

export interface DepartmentRecord {
  id: string;
  facilityId: string;
}

export interface FinancialConfigurationRecord {
  id: FinancialConfigurationId;
  version: number;
  status: string;
}

export interface RobotRepository {
  findById(id: RobotId): Promise<PersistedRobot | undefined>;
  findByManufacturerSerial(
    manufacturerId: ManufacturerId,
    normalizedSerial: string,
  ): Promise<PersistedRobot | undefined>;
  create(input: RegisterRobotInput & { normalizedSerialNumber: string }): Promise<PersistedRobot>;
  updateOwnershipStateWithVersion(
    id: RobotId,
    expectedVersion: number,
    ownershipState: "ownership_verified",
  ): Promise<PersistedRobot>;
}

export interface RobotOwnershipRepository {
  lockRobotOwnership(robotId: RobotId): Promise<void>;
  countActiveRobotsForOwner(
    ownerOrganizationId: OrganizationId,
    at: Date,
  ): Promise<number>;
  findOverlap(
    robotId: RobotId,
    startAt: Date,
    endAt?: Date,
  ): Promise<PersistedOwnership | undefined>;
  findCurrentVerifiedOwner(
    robotId: RobotId,
    at: Date,
  ): Promise<PersistedOwnership | undefined>;
  createVerified(input: VerifyOwnershipInput): Promise<PersistedOwnership>;
}

export interface ContractRepository {
  findById(id: ContractId): Promise<PersistedContract | undefined>;
  create(
    input: CreateContractInput & {
      status: "draft" | "pending_both_approvals";
      rateConfigurationVersionId: FinancialConfigurationId;
    },
  ): Promise<PersistedContract>;
}

export interface ContractVersionRepository {
  create(input: CreateContractVersionInput): Promise<{ id: ContractVersionId }>;
  findById(id: ContractVersionId): Promise<{ id: ContractVersionId; contractId: ContractId } | undefined>;
}

export interface AssignmentRepository {
  findOverlap(
    robotId: RobotId,
    startAt: Date,
    endAt: Date,
  ): Promise<PersistedAssignment | undefined>;
  create(
    input: CreateAssignmentInput & {
      robotOwnerOrganizationId: OrganizationId;
      manufacturerId: ManufacturerId;
      hiringCompanyId: HiringCompanyId;
      facilityId: string;
      departmentId?: string;
    },
  ): Promise<PersistedAssignment & { id: AssignmentId }>;
}

export interface AuditRepository {
  insert(input: AuditRecordInput): Promise<void>;
}

export interface OutboxRepository {
  insert(event: DomainEvent<Record<string, unknown>>): Promise<void>;
}

export interface DomainRepositories {
  organizations: {
    findById(id: OrganizationId): Promise<OrganizationRecord | undefined>;
  };
  manufacturers: {
    findById(id: ManufacturerId): Promise<ManufacturerRecord | undefined>;
  };
  robotModels: {
    findById(id: RobotModelId): Promise<RobotModelRecord | undefined>;
  };
  hiringCompanies: {
    findById(id: HiringCompanyId): Promise<HiringCompanyRecord | undefined>;
  };
  facilities: {
    findById(id: string): Promise<FacilityRecord | undefined>;
  };
  departments: {
    findById(id: string): Promise<DepartmentRecord | undefined>;
  };
  financialConfigurations: {
    findActive(at: Date): Promise<FinancialConfigurationRecord | undefined>;
  };
  robots: RobotRepository;
  ownership: RobotOwnershipRepository;
  contracts: ContractRepository;
  contractVersions: ContractVersionRepository;
  assignments: AssignmentRepository;
  audit: AuditRepository;
  outbox: OutboxRepository;
}

export interface DomainUnitOfWork {
  transaction<TResult>(
    operation: (repositories: DomainRepositories) => Promise<TResult>,
  ): Promise<TResult>;
}

export interface OutboxWorker {
  runBatch(limit: number): Promise<number>;
}
