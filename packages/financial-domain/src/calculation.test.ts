import { describe,expect,it } from "vitest";
import { calculateFinancialAllocation,divideHalfUp } from "./calculation.js";
const calculate=(seconds:number)=>calculateFinancialAllocation({verifiedDurationSeconds:seconds,
  baseRateMinorUnitsPerHour:500,ownerPlatformFeeBasisPoints:1500,
  companyPlatformFeeBasisPoints:1500,currency:"USD",calculationVersion:1});
describe("financial calculation",()=>{
  it("allocates one hour exactly",()=>expect(calculate(3600)).toEqual({
    companyBaseChargeMinorUnits:500,companyPlatformFeeMinorUnits:75,
    companyTotalChargeMinorUnits:575,ownerGrossEarningMinorUnits:500,
    ownerPlatformFeeMinorUnits:75,ownerNetEarningMinorUnits:425,
    platformRevenueMinorUnits:150,roundingAdjustmentMinorUnits:0}));
  it("prorates thirty minutes using integer arithmetic",()=>{
    const result=calculate(1800);expect(result.companyTotalChargeMinorUnits).toBe(288);
    expect(result.ownerNetEarningMinorUnits+result.platformRevenueMinorUnits)
      .toBe(result.companyTotalChargeMinorUnits);
  });
  it("uses deterministic half-up rounding without floating point",()=>{
    expect(divideHalfUp(1n,2n)).toBe(1n);expect(divideHalfUp(1n,3n)).toBe(0n);
    expect(calculate(1).companyBaseChargeMinorUnits).toBe(0);
  });
});
