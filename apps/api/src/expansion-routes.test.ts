import Fastify from "fastify";
import {describe,expect,it,vi} from "vitest";
import {registerExpansionRoutes,type ExpansionService} from "./expansion-routes.js";

const service:ExpansionService={marketplace:vi.fn(async()=>({items:[]})),recordMarketplaceClick:vi.fn(async()=>undefined),capacity:vi.fn(async()=>({remainingCapacity:3})),acknowledgeCapacity:vi.fn(async x=>x),assignOwner:vi.fn(async x=>({...x,status:"PENDING_PRICE"})),createTrainingProject:vi.fn(async x=>x),startTrainingSession:vi.fn(async x=>x),reviewTrainingSession:vi.fn(async x=>x),recalculateCapacity:vi.fn(async x=>x),createPurchaseOrder:vi.fn(async x=>x),lockAllocationPrice:vi.fn(async x=>x),allocation:vi.fn(async x=>x),payAllocationFromBalance:vi.fn(async x=>x),transitionTrainingSession:vi.fn(async x=>x),addTrainingStream:vi.fn(async x=>x),reportTrainingPrivacy:vi.fn(async x=>x),upsertMarketplaceProduct:vi.fn(async x=>x)};
async function app(){const a=Fastify();await registerExpansionRoutes(a,{service,authenticate:async()=>({userId:"00000000-0000-4000-8000-000000000001"})});return a;}
describe("expansion routes",()=>{
 it("serves the public wearable catalog",async()=>{const a=await app();const r=await a.inject({method:"GET",url:"/api/v1/training-equipment?tier=2"});expect(r.statusCode).toBe(200);expect(service.marketplace).toHaveBeenCalledWith(expect.objectContaining({tier:2}));await a.close();});
 it("requires idempotency for direct username assignment",async()=>{const a=await app();const r=await a.inject({method:"POST",url:"/api/v1/contracts/00000000-0000-4000-8000-000000000010/ownership-allocations/by-username",payload:{username:"owner_one",allocatedMicrounits:"250000"}});expect(r.statusCode).toBe(500);await a.close();});
 it("starts only explicitly consented training sessions",async()=>{const a=await app();const r=await a.inject({method:"POST",url:"/api/v1/training-projects/00000000-0000-4000-8000-000000000010/sessions",headers:{"idempotency-key":"session-123"},payload:{wearableKitId:"00000000-0000-4000-8000-000000000011",consentVersion:"v1",consentAccepted:false}});expect(r.statusCode).toBe(500);expect(service.startTrainingSession).not.toHaveBeenCalled();await a.close();});
});
