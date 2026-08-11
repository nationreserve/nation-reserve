export interface FinancialCalculationInput {
  verifiedDurationSeconds:number;
  baseRateMinorUnitsPerHour:number;
  ownerPlatformFeeBasisPoints:number;
  companyPlatformFeeBasisPoints:number;
  currency:"USD";
  calculationVersion:number;
}
export interface FinancialCalculationResult {
  companyBaseChargeMinorUnits:number;
  companyPlatformFeeMinorUnits:number;
  companyTotalChargeMinorUnits:number;
  ownerGrossEarningMinorUnits:number;
  ownerPlatformFeeMinorUnits:number;
  ownerNetEarningMinorUnits:number;
  platformRevenueMinorUnits:number;
  roundingAdjustmentMinorUnits:number;
}
const checked=(value:bigint)=>{
  const number=Number(value);if(!Number.isSafeInteger(number))throw new Error("FINANCIAL_AMOUNT_OVERFLOW");
  return number;
};
export function divideHalfUp(numerator:bigint,denominator:bigint){
  if(numerator<0n||denominator<=0n)throw new Error("INVALID_FINANCIAL_FRACTION");
  return (numerator*2n+denominator)/(denominator*2n);
}
export function calculateFinancialAllocation(input:FinancialCalculationInput):FinancialCalculationResult{
  if(!Number.isSafeInteger(input.verifiedDurationSeconds)||input.verifiedDurationSeconds<=0)
    throw new Error("INVALID_VERIFIED_DURATION");
  for(const value of [input.baseRateMinorUnitsPerHour,input.ownerPlatformFeeBasisPoints,
    input.companyPlatformFeeBasisPoints,input.calculationVersion])
    if(!Number.isSafeInteger(value)||value<0)throw new Error("INVALID_FINANCIAL_CONFIGURATION");
  const base=divideHalfUp(BigInt(input.verifiedDurationSeconds)*
    BigInt(input.baseRateMinorUnitsPerHour),3600n);
  const companyFee=divideHalfUp(base*BigInt(input.companyPlatformFeeBasisPoints),10000n);
  const ownerFee=divideHalfUp(base*BigInt(input.ownerPlatformFeeBasisPoints),10000n);
  const companyTotal=base+companyFee;const ownerNet=base-ownerFee;
  const platformRevenue=companyFee+ownerFee;
  const rounding=companyTotal-ownerNet-platformRevenue;
  return {companyBaseChargeMinorUnits:checked(base),companyPlatformFeeMinorUnits:checked(companyFee),
    companyTotalChargeMinorUnits:checked(companyTotal),ownerGrossEarningMinorUnits:checked(base),
    ownerPlatformFeeMinorUnits:checked(ownerFee),ownerNetEarningMinorUnits:checked(ownerNet),
    platformRevenueMinorUnits:checked(platformRevenue),roundingAdjustmentMinorUnits:checked(rounding)};
}
