import { createHash, randomUUID } from "node:crypto";
import { normalizeRobotSerial } from "@nation-reserve/domain";
import type { IntegrationConfig } from "./config.js";
import { hashIntegrationSecret, issueCredential, type IntegrationEnvironment,
  type ManufacturerScope } from "./credentials.js";
import { activatedState, assertActivationComplete, assertOwnershipCapacity,
  mapOperationalState, requiredActivationChecks, type CheckStatus, type RobotState } from "./lifecycle.js";

export interface IntegrationPrincipal {
  manufacturerId: string; credentialId: string; environment: IntegrationEnvironment;
  scopes: readonly ManufacturerScope[];
}
export interface ManufacturerRecord {
  id: string; sandboxApproved: boolean; productionApproved: boolean; productionEnabled: boolean;
}
export interface ModelRevisionRecord {
  id: string; modelId: string; manufacturerId: string; status: string;
  supportedApiVersions: readonly string[]; stateMapping: Record<string, string>;
}
export interface RobotRecord extends RobotState {
  id: string; manufacturerId: string; modelId: string; modelRevisionId: string;
  environment: IntegrationEnvironment;
}
export interface ActivationRecord {
  id: string; status: string; environment: IntegrationEnvironment; expiresAt: Date;
  robot: RobotRecord; checks: Record<string, CheckStatus>; stateMapping: Record<string, string>;
}
export interface IntegrationRepositories {
  manufacturerForUpdate(id: string): Promise<ManufacturerRecord | undefined>;
  modelRevision(id: string): Promise<ModelRevisionRecord | undefined>;
  robotForUpdate(id: string): Promise<RobotRecord | undefined>;
  ownerOrganizationForUpdate(id: string): Promise<{ type: string; active: boolean } | undefined>;
  registrationByIdempotency(manufacturerId: string, environment: string, key: string):
    Promise<{ fingerprint: string; value: object } | undefined>;
  insertCredential(input: object): Promise<{ id: string }>;
  insertRegistration(input: object): Promise<{ requestId: string; robot: RobotRecord }>;
  activeOwnedRobotCount(ownerId: string): Promise<number>;
  consumeTransferCode(hash: string, ownerId: string): Promise<{ id: string; robotId: string } | undefined>;
  insertVerifiedClaim(input: object): Promise<{ claimId: string; ownershipId: string }>;
  updateRobot(id: string, expectedVersion: number, state: Partial<RobotState>): Promise<RobotRecord>;
  insertActivation(input: object, checks: readonly string[]): Promise<ActivationRecord>;
  activationForUpdate(id: string): Promise<ActivationRecord | undefined>;
  insertActivationMessage(input: object): Promise<void>;
  markActivationComplete(id: string): Promise<void>;
  audit(action: string, entityType: string, entityId: string, metadata?: object): Promise<void>;
  outbox(type: string, aggregateType: string, aggregateId: string, payload: object): Promise<void>;
}
export interface IntegrationUnitOfWork {
  transaction<T>(operation: (repositories: IntegrationRepositories) => Promise<T>): Promise<T>;
}
function scope(principal: IntegrationPrincipal, required: ManufacturerScope) {
  if (!principal.scopes.includes(required)) throw new Error("MANUFACTURER_SCOPE_REQUIRED");
}
function environment(principal: IntegrationPrincipal, required: IntegrationEnvironment) {
  if (principal.environment !== required) throw new Error("MANUFACTURER_ENVIRONMENT_MISMATCH");
}
function fingerprint(value: object) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export class CredentialService {
  constructor(private readonly uow: IntegrationUnitOfWork, private readonly config: IntegrationConfig) {}
  async issue(actorId: string, manufacturerId: string, target: IntegrationEnvironment,
    name: string, scopes: ManufacturerScope[]) {
    const secret = issueCredential(target, this.config.apiKeyPepper);
    const result = await this.uow.transaction(async (repo) => {
      const manufacturer = await repo.manufacturerForUpdate(manufacturerId);
      if (!manufacturer) throw new Error("MANUFACTURER_NOT_FOUND");
      if (target === "sandbox" && !manufacturer.sandboxApproved) throw new Error("SANDBOX_APPROVAL_REQUIRED");
      if (target === "production" && (!manufacturer.productionApproved || !manufacturer.productionEnabled)) {
        throw new Error("PRODUCTION_APPROVAL_REQUIRED");
      }
      const created = await repo.insertCredential({ manufacturerId, environment: target, name,
        prefix: secret.prefix, secretHash: secret.secretHash, scopes, actorId,
        expiresAt: new Date(Date.now() + this.config.credentialDefaultTtlSeconds * 1000) });
      await repo.audit("manufacturer.credential.created", "manufacturer", manufacturerId,
        { credentialId: created.id, environment: target });
      await repo.outbox("manufacturer.credential.created", "manufacturer", manufacturerId,
        { credentialId: created.id, environment: target, mandatorySecurityNotice: true });
      return created;
    });
    return { ...result, secret: secret.raw };
  }
}

export interface RegistrationCommand {
  modelId: string; modelRevisionId: string; environment: IntegrationEnvironment;
  serialNumber: string; apiVersion: string; idempotencyKey: string;
  hardwareIdentityValue?: string; hardwareRevision?: string; firmwareVersion?: string; regionCode?: string;
}
export class RegistrationService {
  constructor(private readonly uow: IntegrationUnitOfWork, private readonly pepper: string) {}
  async register(principal: IntegrationPrincipal, command: RegistrationCommand) {
    scope(principal, "manufacturer.robots.register"); environment(principal, command.environment);
    const requestFingerprint = fingerprint(command);
    return this.uow.transaction(async (repo) => {
      const previous = await repo.registrationByIdempotency(principal.manufacturerId,
        command.environment, command.idempotencyKey);
      if (previous) {
        if (previous.fingerprint !== requestFingerprint) throw new Error("IDEMPOTENCY_KEY_REUSED");
        return previous.value;
      }
      const manufacturer = await repo.manufacturerForUpdate(principal.manufacturerId);
      const revision = await repo.modelRevision(command.modelRevisionId);
      if (!manufacturer || !revision || revision.manufacturerId !== principal.manufacturerId ||
          revision.modelId !== command.modelId) throw new Error("MODEL_MANUFACTURER_MISMATCH");
      const approved = command.environment === "production"
        ? revision.status === "production_approved"
        : ["sandbox_approved", "production_approved"].includes(revision.status);
      if (!approved) throw new Error("MODEL_NOT_APPROVED");
      if (!revision.supportedApiVersions.includes(command.apiVersion)) throw new Error("API_VERSION_UNSUPPORTED");
      const created = await repo.insertRegistration({ ...command,
        manufacturerId: principal.manufacturerId, credentialId: principal.credentialId,
        normalizedSerialNumber: normalizeRobotSerial(command.serialNumber), requestFingerprint,
        hardwareIdentityHash: command.hardwareIdentityValue
          ? hashIntegrationSecret(command.hardwareIdentityValue, this.pepper) : undefined });
      await repo.audit("robot.registration.accepted", "robot", created.robot.id, { requestId: created.requestId });
      await repo.outbox("robot.registration.accepted", "robot", created.robot.id, { requestId: created.requestId });
      return created;
    });
  }
}

export class OwnershipService {
  constructor(private readonly uow: IntegrationUnitOfWork, private readonly pepper: string) {}
  async claim(actorId: string, ownerId: string, robotId: string, transferCode: string) {
    return this.uow.transaction(async (repo) => {
      const owner = await repo.ownerOrganizationForUpdate(ownerId);
      const robot = await repo.robotForUpdate(robotId);
      if (!owner || owner.type !== "robot_owner" || !owner.active) throw new Error("ROBOT_OWNER_REQUIRED");
      if (!robot || robot.registrationState !== "registered" || robot.ownershipState !== "unassigned") {
        throw new Error("ROBOT_NOT_CLAIMABLE");
      }
      assertOwnershipCapacity(await repo.activeOwnedRobotCount(ownerId));
      const code = await repo.consumeTransferCode(hashIntegrationSecret(transferCode, this.pepper), ownerId);
      if (!code || code.robotId !== robotId) throw new Error("TRANSFER_CODE_INVALID");
      const result = await repo.insertVerifiedClaim({ actorId, ownerId, robotId, transferCodeId: code.id });
      await repo.updateRobot(robotId, robot.stateVersion,
        { ownershipState: "ownership_verified", activationState: "awaiting_activation" });
      await repo.audit("robot.ownership.verified", "robot", robotId, result);
      await repo.outbox("robot.ownership.verified", "robot", robotId, { ownerOrganizationId: ownerId });
      return result;
    });
  }
}

export class ActivationService {
  constructor(private readonly uow: IntegrationUnitOfWork, private readonly config: IntegrationConfig) {}
  async start(principal: IntegrationPrincipal, robotId: string) {
    scope(principal, "manufacturer.activation.create");
    return this.uow.transaction(async (repo) => {
      const robot = await repo.robotForUpdate(robotId);
      if (!robot || robot.manufacturerId !== principal.manufacturerId) throw new Error("ROBOT_NOT_FOUND");
      environment(principal, robot.environment);
      if (robot.ownershipState !== "ownership_verified") throw new Error("OWNERSHIP_NOT_VERIFIED");
      const activation = await repo.insertActivation({ robotId, environment: robot.environment,
        requestId: randomUUID(), credentialId: principal.credentialId,
        expectedRobotStateVersion: robot.stateVersion,
        expiresAt: new Date(Date.now() + this.config.activationSessionTtlSeconds * 1000) },
      requiredActivationChecks);
      await repo.updateRobot(robotId, robot.stateVersion, { activationState: "activation_in_progress" });
      return activation;
    });
  }
  async test(principal: IntegrationPrincipal, activationId: string, message: {
    requestId: string; nonce: string; timestamp: Date; manufacturerState: string;
  }) {
    scope(principal, "manufacturer.activation.test");
    return this.uow.transaction(async (repo) => {
      const activation = await repo.activationForUpdate(activationId);
      if (!activation || activation.status !== "in_progress") throw new Error("ACTIVATION_NOT_ACTIVE");
      environment(principal, activation.environment);
      if (Math.abs(Date.now() - message.timestamp.getTime()) / 1000 >
          this.config.activationMaxClockSkewSeconds) throw new Error("ACTIVATION_CLOCK_SKEW");
      const mapped = mapOperationalState(activation.stateMapping, message.manufacturerState);
      await repo.insertActivationMessage({ activationId, ...message, mappedPlatformState: mapped,
        result: mapped === "unavailable" ? "rejected" : "accepted" });
      return { mappedPlatformState: mapped, payableTimeCreated: false };
    });
  }
  async complete(principal: IntegrationPrincipal, activationId: string) {
    scope(principal, "manufacturer.activation.complete");
    return this.uow.transaction(async (repo) => {
      const activation = await repo.activationForUpdate(activationId);
      if (!activation || activation.status !== "in_progress") throw new Error("ACTIVATION_NOT_ACTIVE");
      environment(principal, activation.environment); assertActivationComplete(activation.checks);
      const robot = await repo.updateRobot(activation.robot.id, activation.robot.stateVersion,
        activatedState(activation.robot));
      await repo.markActivationComplete(activationId);
      await repo.audit("robot.activation.completed", "robot", robot.id, { activationId });
      await repo.outbox("robot.activation.completed", "robot", robot.id,
        { activationId, financialEligibilityState: "not_payable" });
      return robot;
    });
  }
}


