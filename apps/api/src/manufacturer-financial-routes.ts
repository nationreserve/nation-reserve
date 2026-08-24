 
import type{AppFastifyInstance,AppFastifyRequest}from"./fastify-types.js";
import{z}from"zod";import type{PostgresManufacturerFinancialService}from"./postgres-manufacturer-financial-service.js";
const key=z.string().min(8).max(200);
export function registerManufacturerFinancialRoutes(app:AppFastifyInstance,o:{service:PostgresManufacturerFinancialService;authenticate(r:AppFastifyRequest):Promise<{userId:string}>}){const actor=async(r:AppFastifyRequest)=>(await o.authenticate(r)).userId;
 app.get<{Params:{organizationId:string}}>("/api/v1/organizations/:organizationId/manufacturer/financial-profile",async r=>o.service.profile(await actor(r),r.params.organizationId));
 app.get<{Params:{organizationId:string}}>("/api/v1/organizations/:organizationId/manufacturer/payables",async r=>o.service.payables(await actor(r),r.params.organizationId));
 app.post<{Params:{organizationId:string}}>("/api/v1/organizations/:organizationId/manufacturer/payout/onboarding",async r=>o.service.onboarding(await actor(r),r.params.organizationId,key.parse(r.headers["idempotency-key"])));
 app.post<{Params:{organizationId:string}}>("/api/v1/organizations/:organizationId/manufacturer/payout/refresh",async r=>o.service.refresh(await actor(r),r.params.organizationId));
 app.post<{Params:{purchaseOrderId:string}}>("/api/v1/platform/purchase-orders/:purchaseOrderId/manufacturer-payable",async r=>{const b=z.object({grossAmountCents:z.number().int().positive(),platformFeeCents:z.number().int().nonnegative().default(0)}).parse(r.body);return o.service.createPayable(await actor(r),r.params.purchaseOrderId,b,key.parse(r.headers["idempotency-key"]));});
 app.post<{Params:{payableId:string}}>("/api/v1/platform/manufacturer-payables/:payableId/transfer",async r=>o.service.transfer(await actor(r),r.params.payableId,key.parse(r.headers["idempotency-key"])));
}
