import assert from "node:assert/strict";
import test from "node:test";
import { allocateContribution, grossOwnershipEarningsCents, heartbeatConnectionStatus, highestConcurrentRobotDemand, openSevenDayPaymentWindow, remainingRobotCapacity, UNIT_SCALE } from "./index.js";

test("capacity uses peak concurrency and treats adjacent shifts as non-overlapping", () => {
  const d = (hour:number)=>new Date(Date.UTC(2026,0,1,hour));
  assert.equal(highestConcurrentRobotDemand([{start:d(8),end:d(12),robots:10},{start:d(12),end:d(16),robots:10}]),10);
  assert.equal(highestConcurrentRobotDemand([{start:d(8),end:d(14),robots:12},{start:d(10),end:d(12),robots:8}]),20);
  assert.equal(remainingRobotCapacity(20,{ownedAssigned:5,ordered:4,reserved:3,pendingFulfillment:2}),6);
});

test("dollar balances buy fractional units without forced refund",()=>{
  const result=allocateContribution({availableCents:500_000n,lockedUnitPriceCents:2_000_000n,remainingAllocationMicrounits:UNIT_SCALE,existingContractMicrounits:0n});
  assert.deepEqual(result,{appliedCents:500_000n,purchasedMicrounits:250_000n,remainingAvailableCents:0n,capReached:false});
});

test("allocation stops at the per-contract 20-unit cap and carries balance",()=>{
  const result=allocateContribution({availableCents:2_000_000n,lockedUnitPriceCents:2_000_000n,remainingAllocationMicrounits:2n*UNIT_SCALE,existingContractMicrounits:19_750_000n});
  assert.equal(result.purchasedMicrounits,250_000n); assert.equal(result.appliedCents,500_000n); assert.equal(result.remainingAvailableCents,1_500_000n); assert.equal(result.capReached,true);
});

test("payment window is seven complete 24-hour periods",()=>{const start=new Date("2026-03-07T20:00:00Z"),window=openSevenDayPaymentWindow(start);assert.equal(window.paymentDueAt.toISOString(),"2026-03-14T20:00:00.000Z");});
test("fractional earnings use five dollars per unit hour",()=>{assert.equal(grossOwnershipEarningsCents(250_000n,360_000n),12_500n);});
test("heartbeat thresholds are deterministic",()=>{assert.equal(heartbeatConnectionStatus(59),"ONLINE");assert.equal(heartbeatConnectionStatus(60),"LATE");assert.equal(heartbeatConnectionStatus(90),"OFFLINE");assert.equal(heartbeatConnectionStatus(300),"EXTENDED_DISCONNECTION_REVIEW");});