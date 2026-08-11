export type Numeric = number | bigint;
const value=(input:Numeric)=>Number(input);
export function safeRatio(numerator:Numeric,denominator:Numeric):number{
  const base=value(denominator);return base===0?0:value(numerator)/base;
}
export const kpis={
  robotUtilization:(verifiedSeconds:Numeric,availableSeconds:Numeric)=>safeRatio(verifiedSeconds,availableSeconds),
  paymentSuccessRate:(successful:Numeric,attempts:Numeric)=>safeRatio(successful,attempts),
  averageDowntimeSeconds:(seconds:Numeric,events:Numeric)=>safeRatio(seconds,events),
  averageRevenuePerRobot:(revenueMinorUnits:Numeric,activeRobots:Numeric)=>safeRatio(revenueMinorUnits,activeRobots),
  averageCompanySpend:(revenueMinorUnits:Numeric,activeCompanies:Numeric)=>safeRatio(revenueMinorUnits,activeCompanies),
}as const;
export interface TimePoint{period:string;value:number}
export function growthRate(points:readonly TimePoint[]):number{
  if(points.length<2)return 0;const first=points[0]!.value,last=points.at(-1)!.value;
  return first===0?0:(last-first)/Math.abs(first);
}
