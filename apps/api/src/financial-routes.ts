 
import type{AppFastifyInstance,AppFastifyRequest}from"./fastify-types.js";

import {z} from "zod";
export interface FinancialRouteService{
  organization(userId:string,organizationId:string,resource:string,id?:string):Promise<object>;
  platform(userId:string,resource:string,id?:string):Promise<object>;
  command(userId:string,action:string,id:string|undefined,input:Record<string,unknown>):Promise<object>;
  dispute(userId:string,organizationId:string,input:Record<string,unknown>):Promise<object>;
}
export function registerFinancialRoutes(app:AppFastifyInstance,options:{
  service:FinancialRouteService;authenticate(r:AppFastifyRequest):Promise<{userId:string}>}){
  const actor=async(r:AppFastifyRequest)=>(await options.authenticate(r)).userId;
  const org="/api/v1/organizations/:organizationId";
  for(const [path,resource] of [["billing/account","billing-account"],["billing/summary","billing-summary"],
    ["invoices","invoices"],["financial-disputes","disputes"],["earnings/account","earning-account"],
    ["earnings/summary","earning-summary"],["earnings/statements","statements"],["earnings/holds","holds"],
    ["earnings/disputes","disputes"]] as const)app.get<{Params:{organizationId:string}}>(`${org}/${path}`,
      async r=>options.service.organization(await actor(r),r.params.organizationId,resource));
  for(const [path,resource] of [["invoices/:id","invoice"],["invoices/:id/line-items","invoice-lines"],
    ["financial-disputes/:id","dispute"],["earnings/statements/:id","statement"],
    ["earnings/statements/:id/lines","statement-lines"]] as const)
    app.get<{Params:{organizationId:string;id:string}}>(`${org}/${path}`,async r=>
      options.service.organization(await actor(r),r.params.organizationId,resource,r.params.id));
  const dispute=z.object({amountMinorUnits:z.number().int().positive(),reasonCode:z.string().min(1),
    description:z.string().min(3)});
  app.post<{Params:{organizationId:string;invoiceId:string}}>(`${org}/invoices/:invoiceId/disputes`,
    async(r,reply)=>reply.status(201).send(await options.service.dispute(await actor(r),
      r.params.organizationId,{...dispute.parse(r.body),type:"company_invoice",invoiceId:r.params.invoiceId})));
  app.post<{Params:{organizationId:string}}>(`${org}/earnings/disputes`,async(r,reply)=>
    reply.status(201).send(await options.service.dispute(await actor(r),r.params.organizationId,
      {...dispute.extend({statementId:z.string().uuid()}).parse(r.body),type:"owner_earning"})));
  const resources=["overview","financial-periods","financial-accruals","journal-entries","financial-holds",
    "financial-adjustments","financial-disputes","settlement-batches","reconciliation-runs"];
  for(const resource of resources)app.get(`/api/v1/platform/${resource==="overview"?"financial/overview":resource}`,
    async r=>options.service.platform(await actor(r),resource));
  for(const [path,action] of [["billing/generate-invoices","generate-invoices"],
    ["payroll/generate-statements","generate-statements"],["reconciliation-runs","reconcile"],
    ["settlement-batches","prepare-settlement"],["financial-periods","create-period"],
    ["financial-holds","place-hold"]] as const)
    app.post(`/api/v1/platform/${path}`,async(r,reply)=>reply.status(201).send(
      await options.service.command(await actor(r),action,undefined,(r.body??{}) as Record<string,unknown>)));
  for(const [path,action] of [["invoices/:id/issue","issue-invoice"],["invoices/:id/void","void-invoice"],
    ["earnings-statements/:id/issue","issue-statement"],["financial-holds/:id/release","release-hold"],
    ["settlement-batches/:id/prepare","prepare-batch"],["settlement-batches/:id/approve","approve-batch"],
    ["settlement-batches/:id/cancel","cancel-batch"],["financial-periods/:id/start-closing","start-closing"],
    ["financial-periods/:id/close","close-period"],["financial-periods/:id/reopen","reopen-period"]] as const)
    app.post<{Params:{id:string}}>(`/api/v1/platform/${path}`,async r=>
      options.service.command(await actor(r),action,r.params.id,(r.body??{}) as Record<string,unknown>));
}
