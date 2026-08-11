import{describe,expect,it}from"vitest";import{kpis,growthRate}from"./index.js";
describe("KPI engine",()=>{it("uses safe deterministic ratios",()=>{expect(kpis.robotUtilization(18,24)).toBe(.75);expect(kpis.paymentSuccessRate(0,0)).toBe(0);});it("calculates period growth",()=>expect(growthRate([{period:"1",value:100},{period:"2",value:125}])).toBe(.25));});
