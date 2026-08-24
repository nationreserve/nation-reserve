 
import type{AppFastifyInstance,AppFastifyRequest}from"./fastify-types.js";
import{z}from"zod";import type{PostgresUserFinancialService}from"./postgres-user-financial-service.js";
const key=z.string().min(8).max(200),uuid=z.string().uuid();
export function registerUserFinancialRoutes(app:AppFastifyInstance,o:{service:PostgresUserFinancialService;authenticate(r:AppFastifyRequest):Promise<{userId:string}>}){const actor=async(r:AppFastifyRequest)=>(await o.authenticate(r)).userId;
 app.get("/api/v1/account/financial-profile",async r=>o.service.profile(await actor(r)));
 app.get("/api/v1/account/payment-methods",async r=>o.service.paymentMethods(await actor(r)));
 app.post("/api/v1/account/payment-methods/setup",async r=>o.service.setupPaymentMethod(await actor(r),key.parse(r.headers["idempotency-key"])));
 app.post("/api/v1/account/payment-methods/confirm",async r=>{const b=z.object({providerPaymentMethodId:z.string().min(3),makeDefault:z.boolean().default(true)}).parse(r.body);return o.service.confirmPaymentMethod(await actor(r),b.providerPaymentMethodId,b.makeDefault,key.parse(r.headers["idempotency-key"]));});
 app.post<{Params:{id:string}}>("/api/v1/account/payment-methods/:id/default",async r=>o.service.setDefaultPaymentMethod(await actor(r),uuid.parse(r.params.id)));
 app.delete<{Params:{id:string}}>("/api/v1/account/payment-methods/:id",async r=>o.service.removePaymentMethod(await actor(r),uuid.parse(r.params.id)));
 app.post("/api/v1/account/downpayments",async r=>{const b=z.object({amountCents:z.number().int().min(100),paymentMethodId:uuid}).parse(r.body);return o.service.fund(await actor(r),{purpose:"DOWNPAYMENT",amountCents:b.amountCents,paymentMethodId:b.paymentMethodId,idempotencyKey:key.parse(r.headers["idempotency-key"])});});
 app.post<{Params:{id:string}}>("/api/v1/ownership-allocations/:id/external-payment",async r=>{const b=z.object({paymentMethodId:uuid}).parse(r.body);return o.service.fundAllocation(await actor(r),r.params.id,b.paymentMethodId,key.parse(r.headers["idempotency-key"]));});
 app.post<{Params:{id:string}}>("/api/v1/platform/robot-funding-payments/:id/refunds",async r=>{const b=z.object({amountCents:z.number().int().positive(),reason:z.string().min(10).max(1000)}).parse(r.body);return o.service.refund(await actor(r),r.params.id,b,key.parse(r.headers["idempotency-key"]));});
 app.post("/api/v1/platform/funding-reconciliation-runs",async r=>o.service.reconcile(await actor(r)));
 app.get("/api/v1/platform/funding-finance",async r=>o.service.platformFinance(await actor(r))); app.get("/api/v1/account/transactions",async r=>o.service.transactions(await actor(r)));
 app.post("/api/v1/account/payout/onboarding",async r=>o.service.payoutOnboarding(await actor(r),key.parse(r.headers["idempotency-key"])));
 app.post("/api/v1/account/payout/refresh",async r=>o.service.refreshPayout(await actor(r)));
}
