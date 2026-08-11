import type {
  ContractId,
  DomainEvent,
  OrganizationId,
  RobotId,
  UserId,
} from "@nation-reserve/contracts";

import {
  assignmentBlockingStatuses,
  MAX_ACTIVE_ROBOTS_PER_OWNER,
  permanentlyInactiveLifecycleStates,
} from "./constants.js";
import { DomainError, invariant } from "./errors.js";
import type { DomainRepositories, DomainUnitOfWork } from "./repositories.js";
import {
  createAssignmentSchema,
  createContractSchema,
  registerRobotSchema,
  verifyOwnershipSchema,
  type CreateAssignmentInput,
  type CreateContractInput,
  type RegisterRobotInput,
  type VerifyOwnershipInput,
} from "./schemas.js";
import { normalizeRobotSerial } from "./serial.js";

export interface OperationContext {
  correlationId?: string;
  requestId?: string;
  actorUserId?: UserId;
  actorOrganizationId?: OrganizationId;
}

export interface DomainServiceDependencies {
  unitOfWork: DomainUnitOfWork;
  createId(): string;
  now(): Date;
}

function event(
  dependencies: DomainServiceDependencies,
  context: OperationContext,
  type: string,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
): DomainEvent<Record<string, unknown>> {
  return {
    id: dependencies.createId(),
    type,
    occurredAt: dependencies.now().toISOString(),
    aggregateType,
    aggregateId,
    payload,
    metadata: {
      schemaVersion: 1,
      ...(context.correlationId ? { correlationId: context.correlationId } : {}),
      ...(context.actorUserId ? { actorUserId: context.actorUserId } : {}),
      ...(context.actorOrganizationId
        ? { actorOrganizationId: context.actorOrganizationId }
        : {}),
    },
  };
}

async function auditAndPublish(
  repositories: DomainRepositories,
  dependencies: DomainServiceDependencies,
  context: OperationContext,
  action: string,
  resourceType: string,
  resourceId: string,
  newState: Record<string, unknown>,
): Promise<void> {
  await repositories.audit.insert({
    action,
    resourceType,
    resourceId,
    newState,
    source: "domain_service",
    ...(context.actorUserId ? { actorUserId: context.actorUserId } : {}),
    ...(context.actorOrganizationId
      ? { actorOrganizationId: context.actorOrganizationId }
      : {}),
    ...(context.correlationId ? { correlationId: context.correlationId } : {}),
    ...(context.requestId ? { requestId: context.requestId } : {}),
  });
  await repositories.outbox.insert(
    event(
      dependencies,
      context,
      action,
      resourceType,
      resourceId,
      newState,
    ),
  );
}

export async function registerRobot(
  dependencies: DomainServiceDependencies,
  input: RegisterRobotInput,
  context: OperationContext = {},
) {
  const command = registerRobotSchema.parse(input);
  return dependencies.unitOfWork.transaction(async (repositories) => {
    const manufacturer = await repositories.manufacturers.findById(
      command.manufacturerId,
    );
    invariant(manufacturer, "NOT_FOUND", "Manufacturer was not found.");

    const model = await repositories.robotModels.findById(command.robotModelId);
    invariant(model, "NOT_FOUND", "Robot model was not found.");
    invariant(
      model.manufacturerId === manufacturer.id,
      "ORGANIZATION_TYPE_MISMATCH",
      "Robot model does not belong to the selected manufacturer.",
    );
    invariant(
      model.approvalStatus === "production_approved",
      "INVALID_STATE_TRANSITION",
      "Production robots require a production-approved model.",
    );

    const normalizedSerialNumber = normalizeRobotSerial(
      command.manufacturerSerialNumber,
    );
    const existing = await repositories.robots.findByManufacturerSerial(
      manufacturer.id,
      normalizedSerialNumber,
    );
    if (existing) {
      throw new DomainError(
        "ROBOT_SERIAL_CONFLICT",
        "A robot with this manufacturer serial already exists.",
      );
    }

    const robot = await repositories.robots.create({
      ...command,
      normalizedSerialNumber,
    });
    await auditAndPublish(
      repositories,
      dependencies,
      context,
      "robot.registered",
      "robot",
      robot.id,
      { normalizedSerialNumber, stateVersion: robot.stateVersion },
    );
    return robot;
  });
}

export async function verifyRobotOwnership(
  dependencies: DomainServiceDependencies,
  input: VerifyOwnershipInput,
  context: OperationContext = {},
) {
  const command = verifyOwnershipSchema.parse(input);
  return dependencies.unitOfWork.transaction(async (repositories) => {
    const robot = await repositories.robots.findById(command.robotId);
    invariant(robot, "NOT_FOUND", "Robot was not found.");
    await repositories.ownership.lockRobotOwnership(robot.id);

    const owner = await repositories.organizations.findById(
      command.ownerOrganizationId,
    );
    invariant(owner, "NOT_FOUND", "Owner organization was not found.");
    invariant(
      owner.organizationType === "robot_owner",
      "ORGANIZATION_TYPE_MISMATCH",
      "Verified ownership requires a Robot Owner organization.",
    );

    const ownedCount = await repositories.ownership.countActiveRobotsForOwner(
      owner.id,
      command.ownershipStartAt,
    );
    invariant(
      ownedCount < MAX_ACTIVE_ROBOTS_PER_OWNER,
      "ROBOT_OWNERSHIP_LIMIT_REACHED",
      "A Robot Owner may own no more than 20 active robots.",
      { limit: MAX_ACTIVE_ROBOTS_PER_OWNER },
    );

    const overlap = await repositories.ownership.findOverlap(
      robot.id,
      command.ownershipStartAt,
      command.ownershipEndAt,
    );
    invariant(
      !overlap,
      "ROBOT_OWNERSHIP_OVERLAP",
      "Robot ownership periods must not overlap.",
    );

    const ownership = await repositories.ownership.createVerified(command);
    const updatedRobot = await repositories.robots.updateOwnershipStateWithVersion(
      robot.id,
      robot.stateVersion,
      "ownership_verified",
    );
    await auditAndPublish(
      repositories,
      dependencies,
      context,
      "robot.ownership.verified",
      "robot",
      robot.id,
      {
        ownershipRecordId: ownership.id,
        ownerOrganizationId: owner.id,
        stateVersion: updatedRobot.stateVersion,
      },
    );
    return ownership;
  });
}

export async function createContract(
  dependencies: DomainServiceDependencies,
  input: CreateContractInput,
  context: OperationContext = {},
) {
  const command = createContractSchema.parse(input);
  return dependencies.unitOfWork.transaction(async (repositories) => {
    const [manufacturer, company, facility, activeFinancialConfiguration] =
      await Promise.all([
        repositories.manufacturers.findById(command.manufacturerId),
        repositories.hiringCompanies.findById(command.hiringCompanyId),
        repositories.facilities.findById(command.facilityId),
        repositories.financialConfigurations.findActive(command.startAt),
      ]);
    invariant(manufacturer, "NOT_FOUND", "Manufacturer was not found.");
    invariant(company, "NOT_FOUND", "Hiring Company was not found.");
    invariant(facility, "NOT_FOUND", "Facility was not found.");
    invariant(
      facility.hiringCompanyId === company.id,
      "FACILITY_COMPANY_MISMATCH",
      "Facility does not belong to the selected Hiring Company.",
    );
    invariant(
      activeFinancialConfiguration,
      "FINANCIAL_CONFIGURATION_NOT_FOUND",
      "No financial configuration applies to the contract start.",
    );

    if (command.departmentId) {
      const department = await repositories.departments.findById(
        command.departmentId,
      );
      invariant(department, "NOT_FOUND", "Department was not found.");
      invariant(
        department.facilityId === facility.id,
        "DEPARTMENT_FACILITY_MISMATCH",
        "Department does not belong to the selected facility.",
      );
    }

    const contract = await repositories.contracts.create({
      ...command,
      status: command.draft ? "draft" : "pending_both_approvals",
      rateConfigurationVersionId: activeFinancialConfiguration.id,
    });
    const version = await repositories.contractVersions.create({
      contractId: contract.id,
      versionNumber: 1,
      requestedRobotCount: command.requestedRobotCount,
      operatingWindows: command.operatingWindows,
      requiredCapabilities: command.requiredCapabilities,
      locationRequirements: command.locationRequirements,
      specialTerms: command.specialTerms,
      effectiveAt: dependencies.now(),
      createdByUserId: command.createdByUserId,
      ...(command.changeReason ? { changeReason: command.changeReason } : {}),
    });
    await auditAndPublish(
      repositories,
      dependencies,
      context,
      "contract.created",
      "contract",
      contract.id,
      { versionId: version.id, status: contract.status },
    );
    await repositories.outbox.insert(
      event(
        dependencies,
        context,
        "contract.version.created",
        "contract",
        contract.id,
        { contractVersionId: version.id, versionNumber: 1 },
      ),
    );
    return contract;
  });
}

const assignableContractStatuses = [
  "approved",
  "active",
  "partially_fulfilled",
  "fully_fulfilled",
] as const;

export async function createRobotAssignment(
  dependencies: DomainServiceDependencies,
  input: CreateAssignmentInput,
  context: OperationContext = {},
) {
  const command = createAssignmentSchema.parse(input);
  return dependencies.unitOfWork.transaction(async (repositories) => {
    const [contract, robot, contractVersion] = await Promise.all([
      repositories.contracts.findById(command.contractId),
      repositories.robots.findById(command.robotId),
      repositories.contractVersions.findById(command.contractVersionId),
    ]);
    invariant(contract, "NOT_FOUND", "Contract was not found.");
    invariant(robot, "NOT_FOUND", "Robot was not found.");
    invariant(contractVersion, "NOT_FOUND", "Contract version was not found.");
    invariant(
      contractVersion.contractId === contract.id,
      "CONFLICT",
      "Contract version does not belong to the assignment contract.",
    );
    invariant(
      (assignableContractStatuses as readonly string[]).includes(contract.status),
      "CONTRACT_NOT_ASSIGNABLE",
      "Contract is not eligible for robot assignment.",
    );
    invariant(
      robot.manufacturerId === contract.manufacturerId,
      "ORGANIZATION_TYPE_MISMATCH",
      "Robot manufacturer does not match the contract manufacturer.",
    );
    invariant(
      !(permanentlyInactiveLifecycleStates as readonly string[]).includes(
        robot.finalLifecycleState,
      ),
      "INVALID_STATE_TRANSITION",
      "Permanently inactive robots cannot be assigned.",
    );
    invariant(
      robot.complianceState !== "suspended" &&
        robot.complianceState !== "banned",
      "INVALID_STATE_TRANSITION",
      "Suspended robots cannot be assigned.",
    );
    invariant(
      robot.maintenanceState !== "in_maintenance",
      "INVALID_STATE_TRANSITION",
      "Robots under maintenance cannot be assigned.",
    );

    const owner = await repositories.ownership.findCurrentVerifiedOwner(
      robot.id,
      command.scheduledStartAt,
    );
    invariant(
      owner,
      "INVALID_STATE_TRANSITION",
      "Robot requires a verified owner before assignment.",
    );

    if (
      (assignmentBlockingStatuses as readonly string[]).includes(command.status)
    ) {
      const overlap = await repositories.assignments.findOverlap(
        robot.id,
        command.scheduledStartAt,
        command.scheduledEndAt,
      );
      invariant(
        !overlap,
        "ASSIGNMENT_TIME_CONFLICT",
        "Robot has an incompatible overlapping assignment.",
      );
    }

    const assignment = await repositories.assignments.create({
      ...command,
      robotOwnerOrganizationId: owner.ownerOrganizationId,
      manufacturerId: contract.manufacturerId,
      hiringCompanyId: contract.hiringCompanyId,
      facilityId: contract.facilityId,
      ...(contract.departmentId
        ? { departmentId: contract.departmentId }
        : {}),
    });
    await auditAndPublish(
      repositories,
      dependencies,
      context,
      "assignment.created",
      "assignment",
      assignment.id,
      {
        contractId: contract.id,
        robotId: robot.id,
        ownerOrganizationId: owner.ownerOrganizationId,
      },
    );
    return assignment;
  });
}

export function assertContractApprovalReady(input: {
  manufacturerApprovedAt?: Date | null;
  companyApprovedAt?: Date | null;
}): void {
  invariant(
    input.manufacturerApprovedAt && input.companyApprovedAt,
    "INVALID_STATE_TRANSITION",
    "Contract activation requires manufacturer and Hiring Company approval.",
  );
}

export function assertOptimisticVersion(
  expected: number,
  actual: number,
  resourceId: RobotId | ContractId,
): void {
  if (expected !== actual) {
    throw new DomainError(
      "OPTIMISTIC_LOCK_CONFLICT",
      "The resource changed after it was loaded.",
      { expected, actual, resourceId },
    );
  }
}
