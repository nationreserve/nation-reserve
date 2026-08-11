export const ROBOT_UNIT_RATE_CENTS = 500n;
export const MAX_UNITS_PER_PARTICIPANT_CONTRACT = 20_000_000n;
export const UNIT_SCALE = 1_000_000n;

export type ScheduleWindow = { start: Date; end: Date; robots: number };

export function highestConcurrentRobotDemand(windows: readonly ScheduleWindow[]): number {
  const events = windows.flatMap(({ start, end, robots }) => {
    if (!Number.isInteger(robots) || robots < 0 || end <= start) throw new Error("INVALID_SCHEDULE_WINDOW");
    return [{ at: start.getTime(), delta: robots }, { at: end.getTime(), delta: -robots }];
  }).sort((a, b) => a.at - b.at || a.delta - b.delta); // ending capacity is released before a shift starting at the same instant
  let active = 0, maximum = 0;
  for (const event of events) { active += event.delta; maximum = Math.max(maximum, active); }
  return maximum;
}

export function remainingRobotCapacity(capacity: number, commitments: { ownedAssigned: number; ordered: number; reserved: number; pendingFulfillment: number }): number {
  return Math.max(0, capacity - commitments.ownedAssigned - commitments.ordered - commitments.reserved - commitments.pendingFulfillment);
}

export type AllocationInput = { availableCents: bigint; lockedUnitPriceCents: bigint; remainingAllocationMicrounits: bigint; existingContractMicrounits: bigint };
export type AllocationResult = { appliedCents: bigint; purchasedMicrounits: bigint; remainingAvailableCents: bigint; capReached: boolean };

/** Uses integer minor units and micro-unit ownership. Any sub-cent ownership residue remains available. */
export function allocateContribution(input: AllocationInput): AllocationResult {
  if (input.availableCents < 0n || input.lockedUnitPriceCents <= 0n || input.remainingAllocationMicrounits < 0n || input.existingContractMicrounits < 0n) throw new Error("INVALID_ALLOCATION_INPUT");
  const capRemaining = input.existingContractMicrounits >= MAX_UNITS_PER_PARTICIPANT_CONTRACT ? 0n : MAX_UNITS_PER_PARTICIPANT_CONTRACT - input.existingContractMicrounits;
  const allocatableUnits = input.remainingAllocationMicrounits < capRemaining ? input.remainingAllocationMicrounits : capRemaining;
  const allocationCost = allocatableUnits * input.lockedUnitPriceCents / UNIT_SCALE;
  const appliedCents = input.availableCents < allocationCost ? input.availableCents : allocationCost;
  const purchasedMicrounits = appliedCents * UNIT_SCALE / input.lockedUnitPriceCents;
  return { appliedCents, purchasedMicrounits, remainingAvailableCents: input.availableCents - appliedCents, capReached: input.existingContractMicrounits + purchasedMicrounits >= MAX_UNITS_PER_PARTICIPANT_CONTRACT };
}

export function openSevenDayPaymentWindow(now: Date): { paymentWindowStartedAt: Date; paymentDueAt: Date } {
  if (Number.isNaN(now.getTime())) throw new Error("INVALID_TIMESTAMP");
  return { paymentWindowStartedAt: new Date(now), paymentDueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) };
}

export function grossOwnershipEarningsCents(ownershipMicrounits: bigint, payableUptimeSeconds: bigint): bigint {
  if (ownershipMicrounits < 0n || payableUptimeSeconds < 0n) throw new Error("INVALID_EARNINGS_INPUT");
  return ownershipMicrounits * payableUptimeSeconds * ROBOT_UNIT_RATE_CENTS / (UNIT_SCALE * 3600n);
}

export type HeartbeatConnection = "ONLINE" | "LATE" | "OFFLINE" | "EXTENDED_DISCONNECTION_REVIEW";
export function heartbeatConnectionStatus(secondsSinceValidHeartbeat: number): HeartbeatConnection {
  if (secondsSinceValidHeartbeat < 0) throw new Error("INVALID_HEARTBEAT_AGE");
  if (secondsSinceValidHeartbeat >= 300) return "EXTENDED_DISCONNECTION_REVIEW";
  if (secondsSinceValidHeartbeat >= 90) return "OFFLINE";
  if (secondsSinceValidHeartbeat >= 60) return "LATE";
  return "ONLINE";
}
